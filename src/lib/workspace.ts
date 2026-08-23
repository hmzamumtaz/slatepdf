'use client';

import { PDFDocument, degrees } from 'pdf-lib';
import { readFileAsArrayBuffer, loadPdf, displayFrame } from './pdf-engine';

/**
 * The workspace's document model.
 *
 * Every tool in the workspace takes the current document and hands back a new
 * one. Keeping each result as a real File — rather than a set of pending edits —
 * means every step runs through exactly the same code as the standalone tool,
 * and the thing you download is the thing you have been looking at.
 *
 * Versions are kept in a list rather than overwritten, so stepping back is free
 * and nothing is lost by trying something.
 */

export interface Version {
  id: number;
  file: File;
  /** What produced it, e.g. "Redacted 3 areas". The first is "Opened". */
  label: string;
  pages: number;
  size: number;
}

export const WORKSPACE_FILENAME = 'workspace.pdf';

export function blobToFile(blob: Blob, name = WORKSPACE_FILENAME): File {
  return new File([blob], name, { type: 'application/pdf', lastModified: Date.now() });
}

export async function countPages(file: File): Promise<number> {
  const doc = await loadPdf(await readFileAsArrayBuffer(file));
  return doc.getPageCount();
}

/** One page of the document as the page editor sees it. */
export interface PageOp {
  /** Index of the page in the current document. */
  source: number;
  /** Extra rotation to apply, in degrees clockwise. */
  rotate: number;
}

/**
 * Reorder, rotate and drop pages in a single pass.
 *
 * Doing it one operation at a time means the second operation's page numbers
 * refer to the result of the first, which is a reliable way to move the wrong
 * page. Here every index refers to the document as it was opened.
 */
export async function rebuildPages(file: File, ops: PageOp[]): Promise<Blob> {
  if (ops.length === 0) throw new Error('A PDF needs at least one page.');

  const source = await loadPdf(await readFileAsArrayBuffer(file));
  const total = source.getPageCount();
  for (const op of ops) {
    if (op.source < 0 || op.source >= total) throw new Error('That page is not in this document any more.');
  }

  const out = await PDFDocument.create();
  const copied = await out.copyPages(source, ops.map(op => op.source));
  copied.forEach((page, i) => {
    const turn = ((ops[i].rotate % 360) + 360) % 360;
    if (turn) page.setRotation(degrees((page.getRotation().angle + turn) % 360));
    out.addPage(page);
  });

  return new Blob([await out.save() as unknown as BlobPart], { type: 'application/pdf' });
}

/** Splice another document's pages into this one. */
export async function insertPdf(file: File, incoming: File, atIndex: number): Promise<Blob> {
  const base = await loadPdf(await readFileAsArrayBuffer(file));
  const extra = await loadPdf(await readFileAsArrayBuffer(incoming));
  if (extra.getPageCount() === 0) throw new Error('That file has no pages to insert.');

  const at = Math.max(0, Math.min(atIndex, base.getPageCount()));
  const pages = await base.copyPages(extra, extra.getPageIndices());
  pages.forEach((page, i) => base.insertPage(at + i, page));

  return new Blob([await base.save() as unknown as BlobPart], { type: 'application/pdf' });
}

export interface Placement {
  pageIndex: number;
  /** In PDF points, from the bottom-left of the page. */
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Stamp a transparent PNG — a signature, initials, a logo — onto one page.
 *
 * The placement is given in the coordinates of the page *as displayed*, which is
 * what a user clicking on a preview means. On a page carrying a /Rotate that is
 * not the page's own coordinate system, so the corner is mapped across and the
 * image is turned by the same amount, leaving it upright on screen.
 */
export async function stampImage(file: File, png: Uint8Array, at: Placement): Promise<Blob> {
  const doc = await loadPdf(await readFileAsArrayBuffer(file));
  if (at.pageIndex < 0 || at.pageIndex >= doc.getPageCount()) {
    throw new Error('That page is not in this document any more.');
  }

  const page = doc.getPage(at.pageIndex);
  const frame = displayFrame(page);
  const [x, y] = frame.toUser(at.x, at.y);

  const image = await doc.embedPng(png as unknown as ArrayBuffer);
  page.drawImage(image, {
    x,
    y,
    width: at.width,
    height: at.height,
    rotate: degrees(frame.turn),
  });
  return new Blob([await doc.save() as unknown as BlobPart], { type: 'application/pdf' });
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
