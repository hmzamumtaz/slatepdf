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

export type ScanFilter = 'photo' | 'enhance' | 'grayscale' | 'bw';

const DETECT_MAX_SIDE = 320;

const MIN_AREA_FRAC = 0.10;       // page must cover at least 10% of the frame
const MAX_AREA_FRAC = 0.94;       // …and must not swallow the whole frame
const MIN_CORNER_MARGIN = 0.02;   // corners should sit ≥2% inside the frame
const MIN_ANGLE_DEG = 40;         // interior angles must look like real corners
const MAX_ANGLE_DEG = 140;
const MAX_ASPECT_RATIO = 2.4;     // document width/height bounds
const MIN_EDGE_STRENGTH = 52;     // mean Sobel magnitude along each edge

/* ------------------------------------------------------------------ *
 *  Grayscale / blur / gradients — the cheap preprocessing stack
 * ------------------------------------------------------------------ */

function toGrayScale(video: HTMLVideoElement, maxSide: number): { gray: Float32Array; w: number; h: number } | null {
  const sw = video.videoWidth;
  const sh = video.videoHeight;
  if (!sw || !sh) return null;
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.max(2, Math.round(sw * scale));
  const h = Math.max(2, Math.round(sh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    gray[i] = data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114;
  }
  return { gray, w, h };
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

function morphClose(bin: Uint8Array, w: number, h: number): Uint8Array {
  const dilate = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (bin[i] === 1) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < w && ny < h) dilate[ny * w + nx] = 1;
          }
        }
      }
    }
  }
  const eroded = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let all = 1;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
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

/**
 * Detect the document's corners in a live video frame.
 * Returns 4 normalized [0..1] corners in TL,TR,BR,BL order, or null when no
 * convincing quad is found.
 */
export function detectDocumentCorners(video: HTMLVideoElement): Corner[] | null {
  const g = toGrayScale(video, DETECT_MAX_SIDE);
  if (!g) return null;
  const { w, h } = g;
  const blurred = boxBlur(g.gray, w, h, 2);
  const mag = sobelMagnitude(blurred, w, h);
  const th = otsuThreshold(mag, w * h);
  let bin = thresholdBinary(mag, w * h, th);
  bin = morphClose(bin, w, h);
  bin = morphClose(bin, w, h);

  const comp = largestComponentBoundary(bin, w, h);
  if (!comp) return null;
  // Too small to be a meaningful document.
  if (comp.count < w * h * 0.12) return null;

  const hull = convexHull(comp.pts);
  const quad = quadFromHull(hull);
  if (!quad) return null;
  if (!isValidDocumentQuad(quad, w, h, mag)) return null;

  return quad.map(p => ({ x: Math.min(0.995, Math.max(0.005, p.x / (w - 1))), y: Math.min(0.995, Math.max(0.005, p.y / (h - 1))) }));
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
 * Perspective-correct a captured frame using the detected corners. Returns a
 * new canvas with the straightened page; applies the selected filter.
 */
export function warpPageFrame(
  video: HTMLVideoElement,
  quad: Corner[],
  filter: ScanFilter,
  maxOut = 2000,
  maxSource = 1600,
): HTMLCanvasElement | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  // Downscale the source before the per-pixel pass to keep the (blocking) warp
  // fast enough to still feel responsive on phones.
  const sScale = Math.min(1, maxSource / Math.max(vw, vh));
  const sw = Math.max(2, Math.round(vw * sScale));
  const sh = Math.max(2, Math.round(vh * sScale));

  const src = document.createElement('canvas');
  src.width = sw;
  src.height = sh;
  const sctx = src.getContext('2d', { willReadFrequently: true });
  if (!sctx) return null;
  sctx.drawImage(video, 0, 0, sw, sh);
  const srcData = sctx.getImageData(0, 0, sw, sh);

  // Target size from the quad's edge lengths (pixels in the source frame).
  const [tl, tr, br, bl] = quad;
  const wTop = Math.hypot((tr.x - tl.x) * sw, (tr.y - tl.y) * sh);
  const wBot = Math.hypot((br.x - bl.x) * sw, (br.y - bl.y) * sh);
  const hLeft = Math.hypot((bl.x - tl.x) * sw, (bl.y - tl.y) * sh);
  const hRight = Math.hypot((br.x - tr.x) * sw, (br.y - tr.y) * sh);
  const outW0 = Math.round((wTop + wBot) / 2);
  const outH0 = Math.round((hLeft + hRight) / 2);
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

  return applyFilter(out, filter);
}

/** Apply an Adobe-Scan-style filter to a page canvas. */
export function applyFilter(canvas: HTMLCanvasElement, filter: ScanFilter): HTMLCanvasElement {
  if (filter === 'photo') return canvas;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  if (filter === 'enhance') {
    ctx.filter = 'contrast(1.18) saturate(1.35) brightness(1.04)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
    return canvas;
  }

  // Grayscale (and black & white step through a hard threshold).
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const gray = new Float32Array(canvas.width * canvas.height);
  for (let i = 0; i < gray.length; i++) {
    const o = i * 4;
    gray[i] = d[o] * 0.299 + d[o + 1] * 0.587 + d[o + 2] * 0.114;
  }
  if (filter === 'grayscale') {
    for (let i = 0; i < gray.length; i++) {
      const o = i * 4;
      const v = gray[i];
      d[o] = d[o + 1] = d[o + 2] = v;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }
  // black & white
  const th = otsuThreshold(gray, gray.length);
  for (let i = 0; i < gray.length; i++) {
    const o = i * 4;
    const v = gray[i] > th ? 255 : 0;
    d[o] = d[o + 1] = d[o + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}