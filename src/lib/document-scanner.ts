'use client';

/**
 * Client-side document scanner vision.
 *
 * Finds the document's four corners in a live camera frame (the page-detection
 * overlay) and warps/crops the captured frame to a flat, perspective-corrected
 * page ready to become a PDF. Everything runs on the device — no uploads.
 */

export interface Corner {
  x: number;
  y: number;
}

export type ScanFilter = 'photo' | 'enhance' | 'lighttext' | 'grayscale' | 'bw' | 'whiteboard';

const DETECT_MAX_SIDE = 448;

const MIN_AREA_FRAC = 0.06;       // page must cover at least 6% of the frame
const MAX_AREA_FRAC = 0.97;       // …and must not swallow the whole frame
const MIN_CORNER_MARGIN = 0.012;  // corners should sit ≥1.2% inside the frame
const MIN_ANGLE_DEG = 40;         // interior angles must look like real corners
const MAX_ANGLE_DEG = 140;
const MAX_ASPECT_RATIO = 3.2;     // document width/height bounds
const MIN_EDGE_STRENGTH = 26;     // mean Sobel magnitude along each edge

/* ------------------------------------------------------------------ *
 *  Grayscale / blur / gradients — the cheap preprocessing stack
 * ------------------------------------------------------------------ */

// The live detector runs ~12 times a second; reusing one small canvas keeps
// phones (iOS especially) from piling up canvas memory between collections.
let sharedCanvas: HTMLCanvasElement | null = null;

function toGrayScale(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  maxSide: number,
  reuse = false,
): { gray: Float32Array; w: number; h: number } | null {
  if (!sw || !sh) return null;
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.max(2, Math.round(sw * scale));
  const h = Math.max(2, Math.round(sh * scale));
  const canvas = reuse ? (sharedCanvas ??= document.createElement('canvas')) : document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    gray[i] = data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114;
  }
  if (!reuse) releaseCanvas(canvas);
  return { gray, w, h };
}

/**
 * Free a canvas's pixel memory now instead of at the next garbage
 * collection. iOS Safari caps total canvas memory and throws once it is
 * exceeded, so large intermediates must be released explicitly.
 */
export function releaseCanvas(c: HTMLCanvasElement | null | undefined): void {
  if (!c) return;
  c.width = 0;
  c.height = 0;
}

/**
 * A tiny fingerprint of the frame: mean brightness plus a 12×12 grey
 * thumbnail. Used to tell "too dark" scenes and whether a new page has been
 * put in front of the camera since the last capture.
 */
export function frameSignature(video: HTMLVideoElement): { mean: number; thumb: Float32Array } | null {
  const g = toGrayScale(video, video.videoWidth, video.videoHeight, 12, true);
  if (!g) return null;
  let sum = 0;
  for (let i = 0; i < g.gray.length; i++) sum += g.gray[i];
  return { mean: sum / g.gray.length, thumb: g.gray };
}

/** Mean absolute difference between two frame fingerprints (0–255). */
export function signatureDistance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return 255;
  let d = 0;
  for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]);
  return d / a.length;
}

function boxBlur(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  const out = new Float32Array(src.length);
  const r = Math.max(1, radius);
  // Horizontal pass into a temp buffer
  const tmp = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    const rowStart = y * w;
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w - 1, x + r);
      for (let k = x0; k <= x1; k++) { sum += src[rowStart + k]; count++; }
      tmp[rowStart + x] = sum / count;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      let count = 0;
      const y0 = Math.max(0, y - r);
      const y1 = Math.min(h - 1, y + r);
      for (let k = y0; k <= y1; k++) { sum += tmp[k * w + x]; count++; }
      out[y * w + x] = sum / count;
    }
  }
  return out;
}

function sobelMagnitude(src: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -src[i - w - 1] - 2 * src[i - 1] - src[i + w - 1]
        + src[i - w + 1] + 2 * src[i + 1] + src[i + w + 1];
      const gy =
        -src[i - w - 1] - 2 * src[i - w] - src[i - w + 1]
        + src[i + w - 1] + 2 * src[i + w] + src[i + w + 1];
      out[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return out;
}

/** Otsu threshold on an edge-magnitude histogram. */
function otsuThreshold(values: Float32Array, len: number): number {
  const HIST = 256;
  const hist = new Float64Array(HIST);
  let total = 0;
  for (let i = 0; i < len; i++) {
    const v = Math.min(255, values[i]);
    hist[v | 0]++;
    total++;
  }
  if (total === 0) return 30;
  let sumAll = 0;
  for (let i = 0; i < HIST; i++) sumAll += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let maxVar = -1;
  let threshold = 30;
  for (let i = 0; i < HIST; i++) {
    wB += hist[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = i;
    }
  }
  return threshold;
}

function thresholdBinary(values: Float32Array, len: number, th: number): Uint8Array {
  const bin = new Uint8Array(len);
  for (let i = 0; i < len; i++) bin[i] = values[i] > th ? 1 : 0;
  return bin;
}

function morphClose(bin: Uint8Array, w: number, h: number, radius = 1): Uint8Array {
  const ra = Math.max(1, radius);
  const dilate = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (bin[i] === 1) {
        for (let dy = -ra; dy <= ra; dy++) {
          for (let dx = -ra; dx <= ra; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < w && ny < h) dilate[ny * w + nx] = 1;
          }
        }
      }
    }
  }
  const eroded = new Uint8Array(w * h);
  for (let y = ra; y < h - ra; y++) {
    for (let x = ra; x < w - ra; x++) {
      let all = 1;
      for (let dy = -ra; dy <= ra; dy++) {
        for (let dx = -ra; dx <= ra; dx++) {
          if (dilate[(y + dy) * w + (x + dx)] === 0) { all = 0; break; }
        }
        if (!all) break;
      }
      eroded[y * w + x] = all;
    }
  }
  return eroded;
}

/* ------------------------------------------------------------------ *
 *  Connected components → convex hull → corner guess
 * ------------------------------------------------------------------ */

interface Point { x: number; y: number }

function largestComponentBoundary(bin: Uint8Array, w: number, h: number): { pts: Point[]; count: number } | null {
  const visited = new Uint8Array(w * h);
  let bestPts: Point[] | null = null;
  let bestCount = 0;
  const queue = new Int32Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (bin[start] !== 1 || visited[start]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    const boundary: Point[] = [];
    let count = 0;
    while (head < tail) {
      const i = queue[head++];
      const x = i % w;
      const y = (i / w) | 0;
      count++;
      // Keep only boundary pixels for the hull (interior adds nothing).
      if (
        x === 0 || y === 0 || x === w - 1 || y === h - 1 ||
        bin[i - 1] === 0 || bin[i + 1] === 0 || bin[i - w] === 0 || bin[i + w] === 0
      ) {
        boundary.push({ x, y });
      }
      if (x > 0 && bin[i - 1] === 1 && !visited[i - 1]) { visited[i - 1] = 1; queue[tail++] = i - 1; }
      if (x < w - 1 && bin[i + 1] === 1 && !visited[i + 1]) { visited[i + 1] = 1; queue[tail++] = i + 1; }
      if (y > 0 && bin[i - w] === 1 && !visited[i - w]) { visited[i - w] = 1; queue[tail++] = i - w; }
      if (y < h - 1 && bin[i + w] === 1 && !visited[i + w]) { visited[i + w] = 1; queue[tail++] = i + w; }
    }
    if (count > bestCount) {
      bestCount = count;
      bestPts = boundary;
    }
  }
  if (!bestPts || bestPts.length < 8) return null;
  return { pts: bestPts, count: bestCount };
}

function convexHull(pts: Point[]): Point[] {
  if (pts.length <= 3) return pts.slice();
  const sorted = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Guess the four document corners from the convex hull using diagonal
 * extremes — the hull point that maximises/minimises x±y in each quadrant.
 * Robust for near-frontal shots even under rotation.
 */
function quadFromHull(hull: Point[]): Point[] | null {
  if (hull.length < 4) return null;
  let tl = hull[0], tr = hull[0], br = hull[0], bl = hull[0];
  for (const p of hull) {
    const s = p.x + p.y;
    const d = p.x - p.y;
    if (s < tl.x + tl.y) tl = p;
    if (s > br.x + br.y) br = p;
    if (d > tr.x - tr.y) tr = p;
    if (d < bl.x - bl.y) bl = p;
  }
  // Sanity: all four must be distinct logical corners.
  const set = new Set([`${tl.x},${tl.y}`, `${tr.x},${tr.y}`, `${br.x},${br.y}`, `${bl.x},${bl.y}`]);
  if (set.size < 4) return null;
  return [tl, tr, br, bl];
}

function polygonArea(pts: Point[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

function interiorAngleDeg(a: Point, b: Point, c: Point): number {
  const ux = a.x - b.x;
  const uy = a.y - b.y;
  const vx = c.x - b.x;
  const vy = c.y - b.y;
  const lu = Math.hypot(ux, uy);
  const lv = Math.hypot(vx, vy);
  if (lu < 1e-6 || lv < 1e-6) return 0;
  const cos = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (lu * lv)));
  return Math.acos(cos) * 180 / Math.PI;
}

function sampleMag(mag: Float32Array, w: number, h: number, x: number, y: number): number {
  const x0 = Math.max(0, Math.min(w - 1, x));
  const y0 = Math.max(0, Math.min(h - 1, y));
  const xf = Math.floor(x0);
  const yf = Math.floor(y0);
  const x1 = Math.min(w - 1, xf + 1);
  const y1 = Math.min(h - 1, yf + 1);
  const fx = x0 - xf;
  const fy = y0 - yf;
  return (
    (mag[yf * w + xf] * (1 - fx) + mag[yf * w + x1] * fx) * (1 - fy)
    + (mag[y1 * w + xf] * (1 - fx) + mag[y1 * w + x1] * fx) * fy
  );
}

/** Mean gradient magnitude along each edge; returns the weakest edge's mean. */
function minEdgeStrength(q: Point[], mag: Float32Array, w: number, h: number): number {
  let minVal = Infinity;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(6, Math.round(len / 2));
    let sum = 0;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      sum += sampleMag(mag, w, h, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    }
    minVal = Math.min(minVal, sum / (steps + 1));
  }
  return minVal;
}

/**
 * A candidate quad is only accepted when it is a convincing page:
 * convex, four real corners, document-like aspect, inside-frame, and bounded
 * by strong edges on all four sides. This is the gate that stops the scanner
 * from capturing "anything".
 */
function isValidDocumentQuad(q: Point[], w: number, h: number, mag: Float32Array): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    const c = q[(i + 2) % 4];
    const cr = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    const s = Math.sign(cr);
    if (s !== 0) {
      if (sign !== 0 && s !== sign) return false;
      sign = s;
    }
    const angle = interiorAngleDeg(a, b, c);
    if (angle < MIN_ANGLE_DEG || angle > MAX_ANGLE_DEG) return false;
  }

  const edges = [0, 1, 2, 3].map(i =>
    Math.hypot(q[(i + 1) % 4].x - q[i].x, q[(i + 1) % 4].y - q[i].y),
  );
  const maxEdge = Math.max(...edges);
  const minEdge = Math.min(...edges);
  if (minEdge <= 1 || maxEdge / minEdge > MAX_ASPECT_RATIO) return false;

  const area = polygonArea(q);
  if (area < w * h * MIN_AREA_FRAC || area > w * h * MAX_AREA_FRAC) return false;

  for (const p of q) {
    const margin = Math.min(p.x, w - 1 - p.x, p.y, h - 1 - p.y);
    if (margin < Math.min(w, h) * MIN_CORNER_MARGIN) return false;
  }

  if (minEdgeStrength(q, mag, w, h) < MIN_EDGE_STRENGTH) return false;
  return true;
}

/* ------------------------------------------------------------------ *
 *  Public detection entry point
 * ------------------------------------------------------------------ */

function toNormQuad(q: Point[], w: number, h: number): Corner[] {
  return q.map(p => ({ x: Math.min(0.995, Math.max(0.005, p.x / (w - 1))), y: Math.min(0.995, Math.max(0.005, p.y / (h - 1))) }));
}

function quadFromComponent(bin: Uint8Array, w: number, h: number, mag: Float32Array, minFrac: number): Corner[] | null {
  const comp = largestComponentBoundary(bin, w, h);
  if (!comp || comp.count < w * h * minFrac) return null;
  const hull = convexHull(comp.pts);
  const quad = quadFromHull(hull);
  if (!quad) return null;
  if (!isValidDocumentQuad(quad, w, h, mag)) return null;
  return toNormQuad(quad, w, h);
}

/**
 * Strategy 1 (Adobe-style): find the page via its closed edge loop. The four
 * page edges produce very strong Sobel gradients; morphological closing with a
 * wider kernel bridges small gaps so the loop stays one connected component.
 * Works on plain backgrounds and pages whose brightness matches the desk.
 */
function detectByEdgeLoop(mag: Float32Array, w: number, h: number): Corner[] | null {
  const th = Math.max(6, otsuThreshold(mag, w * h) * 0.85);
  let bin = thresholdBinary(mag, w * h, th);
  bin = morphClose(bin, w, h, 2);
  bin = morphClose(bin, w, h, 1);
  return quadFromComponent(bin, w, h, mag, 0.05);
}

/**
 * Strategy 2 (bright-blob): catch frames where the page is clearly the
 * brightest region (white paper on a darker desk). Otsu splits bright vs
 * dark; the biggest bright zone whose outline reads as a page wins.
 */
function detectByBrightBlob(blurred: Float32Array, w: number, h: number, mag: Float32Array): Corner[] | null {
  const th = otsuThreshold(blurred, w * h);
  const bin = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) bin[i] = blurred[i] > th ? 1 : 0;
  // If the whole frame is "bright" there's no page/background split.
  let brightCount = 0;
  for (let i = 0; i < w * h; i++) brightCount += bin[i];
  if (brightCount >= w * h * 0.92 || brightCount < w * h * 0.04) return null;
  return quadFromComponent(bin, w, h, mag, 0.04);
}

/**
 * Detect the document's corners in a live video frame.
 * Returns 4 normalized [0..1] corners in TL,TR,BR,BL order, or null when no
 * convincing quad is found. Runs both detection strategies each frame and
 * returns the first valid page quad.
 */
export function detectDocumentCorners(video: HTMLVideoElement): Corner[] | null {
  return detectInSource(video, video.videoWidth, video.videoHeight, true);
}

/** Same detection on a still image (a gallery photo or a full-resolution capture). */
export function detectDocumentCornersInImage(image: HTMLCanvasElement): Corner[] | null {
  return detectInSource(image, image.width, image.height);
}

function detectInSource(source: CanvasImageSource, sw: number, sh: number, reuse = false): Corner[] | null {
  const g = toGrayScale(source, sw, sh, DETECT_MAX_SIDE, reuse);
  if (!g) return null;
  const { w, h } = g;
  const blurred = boxBlur(g.gray, w, h, 3);
  const mag = sobelMagnitude(blurred, w, h);

  const byEdges = detectByEdgeLoop(mag, w, h);
  if (byEdges) return byEdges;

  const byBright = detectByBrightBlob(blurred, w, h, mag);
  if (byBright) return byBright;

  return null;
}

/* ------------------------------------------------------------------ *
 *  Perspective warp (homography) + filters
 * ------------------------------------------------------------------ */

/** Solve the 8x8 homography system for 4 src→dst correspondences. */
function solveHomography(ax: number[], bx: number[]): number[] | null {
  // Build augmented 8x9 matrix (A | b); unknowns are h[0..7], h[8]=1 fixed.
  const n = 8;
  const m: number[][] = Array.from({ length: n }, () => new Array(n + 1).fill(0));
  for (let i = 0; i < 4; i++) {
    const x = ax[i * 2], y = ax[i * 2 + 1];
    const u = bx[i * 2], v = bx[i * 2 + 1];
    const r1 = i * 2;
    const r2 = i * 2 + 1;
    m[r1][0] = x; m[r1][1] = y; m[r1][2] = 1; m[r1][3] = 0; m[r1][4] = 0; m[r1][5] = 0;
    m[r1][6] = -u * x; m[r1][7] = -u * y; m[r1][8] = u;
    m[r2][0] = 0; m[r2][1] = 0; m[r2][2] = 0; m[r2][3] = x; m[r2][4] = y; m[r2][5] = 1;
    m[r2][6] = -v * x; m[r2][7] = -v * y; m[r2][8] = v;
  }
  // Gaussian elimination with partial pivoting.
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    if (Math.abs(m[pivot][col]) < 1e-10) return null;
    if (pivot !== col) [m[pivot], m[col]] = [m[col], m[pivot]];
    for (let r = col + 1; r < n; r++) {
      const f = m[r][col] / m[col][col];
      for (let c = col; c <= n; c++) m[r][c] -= f * m[col][c];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = m[r][n];
    for (let c = r + 1; c < n; c++) s -= m[r][c] * x[c];
    x[r] = s / m[r][r];
  }
  return [x[0], x[1], x[2], x[3], x[4], x[5], x[6], x[7], 1];
}

function invert3x3(h: number[]): number[] | null {
  const [a, b, c, d, e, f, g, hh, i] = h;
  const A = e * i - f * hh;
  const B = -(d * i - f * g);
  const C = d * hh - e * g;
  const D = -(b * i - c * hh);
  const E = a * i - c * g;
  const F = -(a * hh - b * g);
  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-10) return null;
  const invDet = 1 / det;
  return [A * invDet, D * invDet, G * invDet, B * invDet, E * invDet, H * invDet, C * invDet, F * invDet, I * invDet];
}

function bilinearSample(data: Uint8ClampedArray, w: number, h: number, x: number, y: number, out: number[]): void {
  const xf = Math.max(0, Math.min(w - 1, x));
  const yf = Math.max(0, Math.min(h - 1, y));
  const x0 = Math.floor(xf);
  const y0 = Math.floor(yf);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const fx = xf - x0;
  const fy = yf - y0;
  const i00 = (y0 * w + x0) * 4;
  const i10 = (y0 * w + x1) * 4;
  const i01 = (y1 * w + x0) * 4;
  const i11 = (y1 * w + x1) * 4;
  for (let c = 0; c < 3; c++) {
    const t = (data[i00 + c] * (1 - fx) + data[i10 + c] * fx) * (1 - fy)
      + (data[i01 + c] * (1 - fx) + data[i11 + c] * fx) * fy;
    out[c] = t;
  }
}

export interface PixelPoint {
  x: number;
  y: number;
}

function strokeQuadPath(ctx: CanvasRenderingContext2D, pts: PixelPoint[], stroke: string, lineWidth: number): void {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = stroke;
  ctx.beginPath();
  const dotR = Math.max(3, lineWidth * 1.6);
  for (const p of pts) {
    ctx.moveTo(p.x + dotR, p.y);
    ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
  }
  ctx.fill();
}

/**
 * Draw the detected page boundary using display pixel coordinates. Pass the
 * corners already transformed from video space (see the cover-transform in the
 * tool component) so the overlay stays glued to the visible video even when
 * object-cover crops the feed.
 */
export function drawDetectionOverlayPixels(
  ctx: CanvasRenderingContext2D,
  pts: PixelPoint[],
  width: number,
  height: number,
  stroke = '#22c55e',
): void {
  ctx.clearRect(0, 0, width, height);
  strokeQuadPath(ctx, pts, stroke, Math.max(2, Math.min(4.5, width / 180)));
}

export function drawDetectionOverlay(
  ctx: CanvasRenderingContext2D,
  quad: Corner[],
  width: number,
  height: number,
): void {
  const pts = quad.map(p => ({ x: p.x * width, y: p.y * height }));
  drawDetectionOverlayPixels(ctx, pts, width, height);
}

/**
 * Sharpen detected corners on the full-resolution capture. Live detection runs
 * on a small thumbnail, so its corners can be several pixels off. For each
 * edge, find the strongest brightness step across the edge at many points,
 * fit a straight line through them, and intersect neighbouring lines.
 */
export function refineCorners(image: HTMLCanvasElement, quad: Corner[]): Corner[] {
  const g = toGrayScale(image, image.width, image.height, 1400);
  if (!g) return quad;
  const { w, h } = g;
  const gray = boxBlur(g.gray, w, h, 1);
  const at = (x: number, y: number) => {
    const xi = Math.max(0, Math.min(w - 1, Math.round(x)));
    const yi = Math.max(0, Math.min(h - 1, Math.round(y)));
    return gray[yi * w + xi];
  };
  const P = quad.map(c => ({ x: c.x * (w - 1), y: c.y * (h - 1) }));
  const reach = Math.max(4, Math.round(Math.min(w, h) * 0.025));
  const lines: { px: number; py: number; dx: number; dy: number }[] = [];

  for (let e = 0; e < 4; e++) {
    const a = P[e];
    const b = P[(e + 1) % 4];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 10) return quad;
    const tx = (b.x - a.x) / len;
    const ty = (b.y - a.y) / len;
    const nx = -ty;
    const ny = tx;
    const pts: { x: number; y: number }[] = [];
    const N = 24;
    for (let i = 1; i < N; i++) {
      const t = 0.08 + (0.84 * i) / N;
      const cx = a.x + (b.x - a.x) * t;
      const cy = a.y + (b.y - a.y) * t;
      let best = 0;
      let bestK = 0;
      for (let k = -reach; k <= reach; k++) {
        const g1 = at(cx + nx * (k + 1), cy + ny * (k + 1));
        const g0 = at(cx + nx * (k - 1), cy + ny * (k - 1));
        const m = Math.abs(g1 - g0);
        if (m > best) { best = m; bestK = k; }
      }
      if (best > 12) pts.push({ x: cx + nx * bestK, y: cy + ny * bestK });
    }
    if (pts.length < 6) return quad;
    // Total least squares line through the points, with one pass of outlier removal.
    const fit = (q: { x: number; y: number }[]) => {
      const mx = q.reduce((s2, p) => s2 + p.x, 0) / q.length;
      const my = q.reduce((s2, p) => s2 + p.y, 0) / q.length;
      let sxx = 0, syy = 0, sxy = 0;
      for (const p of q) { sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2; sxy += (p.x - mx) * (p.y - my); }
      const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
      return { px: mx, py: my, dx: Math.cos(ang), dy: Math.sin(ang) };
    };
    let line = fit(pts);
    const dist = (p: { x: number; y: number }) => Math.abs((p.x - line.px) * line.dy - (p.y - line.py) * line.dx);
    const kept = pts.filter(p => dist(p) < 2.5);
    if (kept.length >= 6) line = fit(kept);
    lines.push(line);
  }

  const out: Corner[] = [];
  for (let i = 0; i < 4; i++) {
    // Corner i is where edge (i-1) meets edge i.
    const l1 = lines[(i + 3) % 4];
    const l2 = lines[i];
    const det = l1.dx * l2.dy - l1.dy * l2.dx;
    if (Math.abs(det) < 1e-6) return quad;
    const t = ((l2.px - l1.px) * l2.dy - (l2.py - l1.py) * l2.dx) / det;
    const x = l1.px + l1.dx * t;
    const y = l1.py + l1.dy * t;
    // A refined corner may only move a little; anything else is a bad fit.
    if (Math.hypot(x - P[i].x, y - P[i].y) > reach * 1.8) return quad;
    out.push({ x: Math.max(0, Math.min(1, x / (w - 1))), y: Math.max(0, Math.min(1, y / (h - 1))) });
  }
  return out;
}

/**
 * True width/height of a rectangle seen in perspective (Zhang & He,
 * "Whiteboard scanning and image enhancement"). Assumes square pixels and the
 * optical centre at the middle of the image; the focal length is recovered
 * from the quad itself. Returns null when the geometry is degenerate.
 */
function rectangleAspect(quad: Corner[], sw: number, sh: number): number | null {
  const [tl, tr, br, bl] = quad;
  const P = (c: Corner) => [c.x * sw - sw / 2, c.y * sh - sh / 2, 1];
  const m1 = P(tl), m2 = P(tr), m3 = P(bl), m4 = P(br);
  const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const d2 = dot(cross(m2, m4), m3);
  const d3 = dot(cross(m3, m4), m2);
  if (Math.abs(d2) < 1e-9 || Math.abs(d3) < 1e-9) return null;
  const k2 = dot(cross(m1, m4), m3) / d2;
  const k3 = dot(cross(m1, m4), m2) / d3;
  const n2 = [k2 * m2[0] - m1[0], k2 * m2[1] - m1[1], k2 - 1];
  const n3 = [k3 * m3[0] - m1[0], k3 * m3[1] - m1[1], k3 - 1];
  let ratio: number;
  const nz = n2[2] * n3[2];
  const f2 = Math.abs(nz) > 1e-9 ? -(n2[0] * n3[0] + n2[1] * n3[1]) / nz : -1;
  if (f2 > 0) {
    ratio = Math.sqrt((n2[0] * n2[0] + n2[1] * n2[1] + f2 * n2[2] * n2[2]) / (n3[0] * n3[0] + n3[1] * n3[1] + f2 * n3[2] * n3[2]));
  } else {
    // Parallel edges (no perspective): plain length ratio.
    ratio = Math.sqrt((n2[0] * n2[0] + n2[1] * n2[1]) / (n3[0] * n3[0] + n3[1] * n3[1]));
  }
  if (!Number.isFinite(ratio) || ratio < 0.15 || ratio > 7) return null;
  // Guard against wild estimates from noisy corners: stay near the edge ratio.
  const edge = Math.hypot((tr.x - tl.x) * sw, (tr.y - tl.y) * sh) / Math.max(1, Math.hypot((bl.x - tl.x) * sw, (bl.y - tl.y) * sh));
  if (ratio / edge > 1.6 || edge / ratio > 1.6) return null;
  return ratio;
}

/** Copy the current video frame into a canvas, capped to `maxSide` pixels. */
export function grabVideoFrame(video: HTMLVideoElement, maxSide = 3200): HTMLCanvasElement | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const scale = Math.min(1, maxSide / Math.max(vw, vh));
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(vw * scale));
  c.height = Math.max(2, Math.round(vh * scale));
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, c.width, c.height);
  return c;
}

/**
 * Perspective-correct the area inside `quad` (normalized corners, TL/TR/BR/BL)
 * into a flat, straight page. Output size follows the quad's own edge lengths,
 * capped at `maxOut` on the long side.
 */
export function warpCanvas(source: HTMLCanvasElement, quad: Corner[], maxOut = 2400): HTMLCanvasElement | null {
  const sw = source.width;
  const sh = source.height;
  if (!sw || !sh || quad.length !== 4) return null;
  const sctx = source.getContext('2d', { willReadFrequently: true });
  if (!sctx) return null;
  const srcData = sctx.getImageData(0, 0, sw, sh);

  const [tl, tr, br, bl] = quad;
  const wTop = Math.hypot((tr.x - tl.x) * sw, (tr.y - tl.y) * sh);
  const wBot = Math.hypot((br.x - bl.x) * sw, (br.y - bl.y) * sh);
  const hLeft = Math.hypot((bl.x - tl.x) * sw, (bl.y - tl.y) * sh);
  const hRight = Math.hypot((br.x - tr.x) * sw, (br.y - tr.y) * sh);
  const avgW = (wTop + wBot) / 2;
  const avgH = (hLeft + hRight) / 2;
  // Edge lengths are foreshortened by perspective; recover the page's true
  // proportions, then keep roughly the captured pixel count.
  const ratio = rectangleAspect(quad, sw, sh) ?? avgW / Math.max(1, avgH);
  const area = Math.max(4, avgW * avgH);
  const outH0 = Math.max(2, Math.sqrt(area / ratio));
  const outW0 = Math.max(2, outH0 * ratio);
  const scale = Math.min(1, maxOut / Math.max(outW0, outH0));
  const outW = Math.max(2, Math.round(outW0 * scale));
  const outH = Math.max(2, Math.round(outH0 * scale));

  const srcPts = [
    tl.x * sw, tl.y * sh,
    tr.x * sw, tr.y * sh,
    br.x * sw, br.y * sh,
    bl.x * sw, bl.y * sh,
  ];
  const dstPts = [0, 0, outW, 0, outW, outH, 0, outH];
  const H = solveHomography(srcPts, dstPts);
  const Hinv = H ? invert3x3(H) : null;

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const octx = out.getContext('2d', { willReadFrequently: true });
  if (!octx) return null;
  const img = octx.createImageData(outW, outH);
  const od = img.data;
  const sample = [0, 0, 0];

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      if (Hinv) {
        const w = Hinv[6] * x + Hinv[7] * y + Hinv[8];
        if (Math.abs(w) < 1e-9) { continue; }
        const sx = (Hinv[0] * x + Hinv[1] * y + Hinv[2]) / w;
        const sy = (Hinv[3] * x + Hinv[4] * y + Hinv[5]) / w;
        bilinearSample(srcData.data, sw, sh, sx, sy, sample);
      } else {
        sample[0] = sample[1] = sample[2] = 255;
      }
      const o = (y * outW + x) * 4;
      od[o] = sample[0];
      od[o + 1] = sample[1];
      od[o + 2] = sample[2];
      od[o + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

/**
 * Perspective-correct a live video frame using the detected corners and apply
 * the selected filter.
 */
export function warpPageFrame(
  video: HTMLVideoElement,
  quad: Corner[],
  filter: ScanFilter,
  maxOut = 2000,
  maxSource = 1600,
): HTMLCanvasElement | null {
  const frame = grabVideoFrame(video, maxSource);
  if (!frame) return null;
  const out = warpCanvas(frame, quad, maxOut);
  return out ? applyFilter(out, filter) : null;
}

export interface ScanAdjust {
  /** -100..100; 0 leaves the page alone. */
  brightness: number;
  /** -100..100; 0 leaves the page alone. */
  contrast: number;
}

/**
 * Estimate the paper's brightness across the page (the "illumination map").
 * Each cell keeps its brightest luminance, so ink and text drop out and only
 * the paper — including shadows and uneven lighting across it — remains.
 */
function illuminationMap(d: Uint8ClampedArray, w: number, h: number): { map: Float32Array; gw: number; gh: number; cell: number } {
  const cell = Math.max(4, Math.round(Math.max(w, h) / 64));
  const gw = Math.ceil(w / cell);
  const gh = Math.ceil(h / cell);
  const raw = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let best = 0;
      const y1 = Math.min(h, (gy + 1) * cell);
      const x1 = Math.min(w, (gx + 1) * cell);
      for (let y = gy * cell; y < y1; y += 2) {
        for (let x = gx * cell; x < x1; x += 2) {
          const o = (y * w + x) * 4;
          const v = d[o] * 0.299 + d[o + 1] * 0.587 + d[o + 2] * 0.114;
          if (v > best) best = v;
        }
      }
      raw[gy * gw + gx] = best;
    }
  }
  // A small max filter swallows thick strokes and headings; the blur then
  // smooths cell-to-cell steps so the correction has no visible tiles.
  const dil = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let m = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx >= 0 && ny >= 0 && nx < gw && ny < gh) m = Math.max(m, raw[ny * gw + nx]);
        }
      }
      dil[gy * gw + gx] = m;
    }
  }
  return { map: boxBlur(dil, gw, gh, 2), gw, gh, cell };
}

function sampleMap(m: { map: Float32Array; gw: number; gh: number; cell: number }, x: number, y: number): number {
  const fx = Math.max(0, Math.min(m.gw - 1, x / m.cell - 0.5));
  const fy = Math.max(0, Math.min(m.gh - 1, y / m.cell - 0.5));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(m.gw - 1, x0 + 1);
  const y1 = Math.min(m.gh - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const g = m.map;
  return (g[y0 * m.gw + x0] * (1 - tx) + g[y0 * m.gw + x1] * tx) * (1 - ty)
    + (g[y1 * m.gw + x0] * (1 - tx) + g[y1 * m.gw + x1] * tx) * ty;
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Linear stretch: `lo` and below → 0, `hi` and above → 255. */
const stretch = (v: number, lo: number, hi: number) => clamp255(((v - lo) / (hi - lo)) * 255);

/**
 * Apply a scan filter (and optional brightness/contrast) to a page canvas in
 * place.
 *
 * - photo: untouched colours.
 * - enhance ("Auto color"): evens out lighting and shadows, whitens the paper,
 *   keeps ink and photos in colour.
 * - grayscale: the same clean-up in shades of grey.
 * - bw: crisp black text on white paper, robust to shadows (adaptive, not a
 *   single global threshold).
 * - lighttext: darkens faint text (pencil, faded receipts) on white paper.
 * - whiteboard: whitens a glossy, unevenly lit board and boosts marker colours.
 */
export function applyFilter(canvas: HTMLCanvasElement, filter: ScanFilter, adjust?: ScanAdjust): HTMLCanvasElement {
  const b = adjust?.brightness ?? 0;
  const c = adjust?.contrast ?? 0;
  if (filter === 'photo' && b === 0 && c === 0) return canvas;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const light = filter === 'photo' ? null : illuminationMap(d, w, h);
  const cf = (100 + c) / 100;
  const bOff = b * 1.2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      let r = d[o];
      let g = d[o + 1];
      let bl = d[o + 2];
      if (light) {
        // Divide by the local paper brightness → the paper becomes uniformly white.
        const bg = Math.max(48, sampleMap(light, x, y));
        const gain = 248 / bg;
        r *= gain; g *= gain; bl *= gain;
        if (filter === 'enhance') {
          r = stretch(r, 18, 242); g = stretch(g, 18, 242); bl = stretch(bl, 18, 242);
          const l = (r + g + bl) / 3;
          r = clamp255(l + (r - l) * 1.25); g = clamp255(l + (g - l) * 1.25); bl = clamp255(l + (bl - l) * 1.25);
        } else if (filter === 'whiteboard') {
          r = stretch(r, 40, 215); g = stretch(g, 40, 215); bl = stretch(bl, 40, 215);
          const l = (r + g + bl) / 3;
          r = clamp255(l + (r - l) * 1.7); g = clamp255(l + (g - l) * 1.7); bl = clamp255(l + (bl - l) * 1.7);
        } else if (filter === 'lighttext') {
          // Faint pencil, receipts and faded print: push every non-paper tone
          // towards black while the paper stays white.
          const l = r * 0.299 + g * 0.587 + bl * 0.114;
          const t = stretch(l, 70, 232) / 255;
          r = g = bl = 255 * Math.pow(t, 2.4);
        } else {
          const l = r * 0.299 + g * 0.587 + bl * 0.114;
          const v = filter === 'bw' ? stretch(l, 105, 185) : stretch(l, 25, 238);
          r = g = bl = v;
        }
      }
      if (c !== 0 || b !== 0) {
        r = clamp255((r - 128) * cf + 128 + bOff);
        g = clamp255((g - 128) * cf + 128 + bOff);
        bl = clamp255((bl - 128) * cf + 128 + bOff);
      }
      d[o] = r;
      d[o + 1] = g;
      d[o + 2] = bl;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Rotate a canvas clockwise by a multiple of 90° (returns the source for 0°). */
export function rotateCanvas(src: HTMLCanvasElement, rotation: number): HTMLCanvasElement {
  const deg = ((rotation % 360) + 360) % 360;
  if (deg === 0) return src;
  const swap = deg % 180 !== 0;
  const c = document.createElement('canvas');
  c.width = swap ? src.height : src.width;
  c.height = swap ? src.width : src.height;
  const ctx = c.getContext('2d');
  if (!ctx) return src;
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return c;
}

/**
 * A cleanup brush stroke. Points are normalized to the page *before* rotation
 * and the radius is a fraction of the page's long side, so strokes stay put
 * when the page is later rotated.
 */
export interface CleanupStroke {
  points: Corner[];
  radius: number;
  color: string;
}

export function applyCleanup(canvas: HTMLCanvasElement, strokes: CleanupStroke[]): HTMLCanvasElement {
  if (strokes.length === 0) return canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const long = Math.max(canvas.width, canvas.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of strokes) {
    if (s.points.length === 0) continue;
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = s.radius * 2 * long;
    ctx.beginPath();
    const p0 = s.points[0];
    if (s.points.length === 1) {
      ctx.arc(p0.x * canvas.width, p0.y * canvas.height, s.radius * long, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.moveTo(p0.x * canvas.width, p0.y * canvas.height);
    for (const p of s.points.slice(1)) ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
    ctx.stroke();
  }
  return canvas;
}

/**
 * Colour to paint with when cleaning up a mark: the paper colour around the
 * point (the brightest common tone in a small window), so the patch blends in.
 */
export function samplePaperColor(canvas: HTMLCanvasElement, x: number, y: number): string {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '#ffffff';
  const r = Math.max(8, Math.round(Math.max(canvas.width, canvas.height) * 0.03));
  const x0 = Math.max(0, Math.round(x * canvas.width) - r);
  const y0 = Math.max(0, Math.round(y * canvas.height) - r);
  const w = Math.min(canvas.width - x0, r * 2);
  const h = Math.min(canvas.height - y0, r * 2);
  if (w <= 0 || h <= 0) return '#ffffff';
  const d = ctx.getImageData(x0, y0, w, h).data;
  const px: [number, number, number, number][] = [];
  for (let i = 0; i < d.length; i += 4) px.push([d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114, d[i], d[i + 1], d[i + 2]]);
  px.sort((a, b) => b[0] - a[0]);
  // Average the brightest quarter: that's the paper, not the mark being removed.
  const top = px.slice(0, Math.max(1, Math.floor(px.length / 4)));
  const avg = [1, 2, 3].map(k => Math.round(top.reduce((s, p) => s + p[k], 0) / top.length));
  return `rgb(${avg[0]}, ${avg[1]}, ${avg[2]})`;
}

/** Split a book spread's quad down the middle into left and right pages. */
export function splitBookQuad(quad: Corner[]): [Corner[], Corner[]] {
  const [tl, tr, br, bl] = quad;
  const midTop = { x: (tl.x + tr.x) / 2, y: (tl.y + tr.y) / 2 };
  const midBot = { x: (bl.x + br.x) / 2, y: (bl.y + br.y) / 2 };
  return [[tl, midTop, midBot, bl], [midTop, tr, br, midBot]];
}

/**
 * Lay the front and back of an ID card on one A4-proportioned page at real
 * size (ID-1 is 85.6 × 54 mm), the way a photocopy of an ID is expected to
 * look.
 */
export function composeIdCard(front: HTMLCanvasElement, back: HTMLCanvasElement | null): HTMLCanvasElement {
  const pageW = 1654; // A4 at 200 dpi
  const pageH = 2339;
  const page = document.createElement('canvas');
  page.width = pageW;
  page.height = pageH;
  const ctx = page.getContext('2d');
  if (!ctx) return front;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pageW, pageH);
  const boxW = Math.round(pageW * (85.6 / 210));
  const boxH = Math.round(boxW * (54 / 85.6));
  const place = (img: HTMLCanvasElement, cy: number) => {
    // Cards are landscape; a portrait capture is turned to fit.
    const src = img.height > img.width ? rotateCanvas(img, 90) : img;
    const s = Math.min(boxW / src.width, boxH / src.height);
    const w = src.width * s;
    const h = src.height * s;
    ctx.drawImage(src, (pageW - w) / 2, cy - h / 2, w, h);
  };
  place(front, pageH * 0.27);
  if (back) place(back, pageH * 0.27 + boxH + pageH * 0.06);
  return page;
}
