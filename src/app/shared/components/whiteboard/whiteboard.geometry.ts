import { WBConnector, WBDocument, WBItem, WBShape } from './whiteboard.model';

export interface WBBBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const WB_HANDLE_CURSORS: Record<string, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};

const HANDLES: Array<[string, (s: WBShape) => { x: number; y: number }]> = [
  ['nw', (s) => ({ x: s.x, y: s.y })],
  ['n', (s) => ({ x: s.x + s.w / 2, y: s.y })],
  ['ne', (s) => ({ x: s.x + s.w, y: s.y })],
  ['e', (s) => ({ x: s.x + s.w, y: s.y + s.h / 2 })],
  ['se', (s) => ({ x: s.x + s.w, y: s.y + s.h })],
  ['s', (s) => ({ x: s.x + s.w / 2, y: s.y + s.h })],
  ['sw', (s) => ({ x: s.x, y: s.y + s.h })],
  ['w', (s) => ({ x: s.x, y: s.y + s.h / 2 })],
];

export function wbHandleAt(s: WBShape, x: number, y: number, zoom: number): string | null {
  const tol = 7 / zoom;
  for (const [name, pos] of HANDLES) {
    const p = pos(s);
    if (Math.abs(x - p.x) <= tol && Math.abs(y - p.y) <= tol) return name;
  }
  return null;
}

export function wbShapeContains(s: WBShape, x: number, y: number): boolean {
  const dx = x - (s.x + s.w / 2);
  const dy = y - (s.y + s.h / 2);
  if (s.kind === 'ellipse') {
    return (dx * dx) / (s.w * s.w * 0.25) + (dy * dy) / (s.h * s.h * 0.25) <= 1;
  }
  if (s.kind === 'diamond') {
    return Math.abs(dx) / (s.w / 2) + Math.abs(dy) / (s.h / 2) <= 1;
  }
  return x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h;
}

/** Point on the shape boundary along the ray from its center toward (tx, ty). */
export function wbAnchor(s: WBShape, tx: number, ty: number): { x: number; y: number } {
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: s.y };
  if (s.kind === 'ellipse') {
    const a = s.w / 2 || 1;
    const b = s.h / 2 || 1;
    const t = 1 / Math.sqrt((dx * dx) / (a * a) + (dy * dy) / (b * b));
    return { x: cx + dx * t, y: cy + dy * t };
  }
  if (s.kind === 'diamond') {
    const t = 1 / (Math.abs(dx) / (s.w / 2) + Math.abs(dy) / (s.h / 2));
    return { x: cx + dx * t, y: cy + dy * t };
  }
  const sx = dx !== 0 ? (s.w / 2) / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? (s.h / 2) / Math.abs(dy) : Infinity;
  const t = Math.min(sx, sy);
  return { x: cx + dx * t, y: cy + dy * t };
}

function wbEndpoint(
  doc: WBDocument,
  shapeId: string | null,
  fx: number,
  fy: number,
  tx: number,
  ty: number,
): { x: number; y: number } {
  if (!shapeId) return { x: fx, y: fy };
  const item = doc.items.find((i) => i.id === shapeId);
  if (!item || item.kind === 'freehand' || item.kind === 'connector') return { x: fx, y: fy };
  return wbAnchor(item, tx, ty);
}

/** Resolved endpoints of a connector (anchors on attached shapes). */
export function wbConnectorEnds(
  doc: WBDocument,
  c: WBConnector,
): { x1: number; y1: number; x2: number; y2: number } {
  const s = wbEndpoint(doc, c.from, c.x1, c.y1, c.x2, c.y2);
  const e = wbEndpoint(doc, c.to, c.x2, c.y2, c.x1, c.y1);
  return { x1: s.x, y1: s.y, x2: e.x, y2: e.y };
}

/** Which endpoint handle of a connector is under the cursor ('p1' = from end). */
export function wbConnectorHandleAt(
  doc: WBDocument,
  c: WBConnector,
  x: number,
  y: number,
  zoom: number,
): 'p1' | 'p2' | null {
  const tol = 9 / zoom;
  const e = wbConnectorEnds(doc, c);
  if (Math.hypot(x - e.x1, y - e.y1) <= tol) return 'p1';
  if (Math.hypot(x - e.x2, y - e.y2) <= tol) return 'p2';
  return null;
}

function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

export function wbHitTest(doc: WBDocument, x: number, y: number, tol: number): WBItem | null {
  for (let i = doc.items.length - 1; i >= 0; i--) {
    const item = doc.items[i];
    if (item.kind === 'freehand') {
      const p = item.points;
      if (p.length === 2 && Math.hypot(x - p[0], y - p[1]) <= tol) return item;
      for (let j = 0; j + 3 < p.length; j += 2) {
        if (segDist(x, y, p[j], p[j + 1], p[j + 2], p[j + 3]) <= tol + item.width / 2) return item;
      }
    } else if (item.kind === 'connector') {
      const e = wbConnectorEnds(doc, item);
      if (segDist(x, y, e.x1, e.y1, e.x2, e.y2) <= tol + 4) return item;
    } else if (wbShapeContains(item, x, y)) {
      return item;
    }
  }
  return null;
}

/** Shape under the cursor (for connector snapping) — ignores strokes/arrows. */
export function wbShapeAt(doc: WBDocument, x: number, y: number, tol: number): WBShape | null {
  for (let i = doc.items.length - 1; i >= 0; i--) {
    const item = doc.items[i];
    if (item.kind !== 'freehand' && item.kind !== 'connector' && wbShapeContains(item, x, y)) return item;
  }
  for (let i = doc.items.length - 1; i >= 0; i--) {
    const item = doc.items[i];
    if (item.kind !== 'freehand' && item.kind !== 'connector') {
      if (x >= item.x - tol && x <= item.x + item.w + tol && y >= item.y - tol && y <= item.y + item.h + tol) return item;
    }
  }
  return null;
}

/** Union bounds of items (world coordinates); null when empty. */
export function wbBBox(doc: WBDocument, items: WBItem[]): WBBBox | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  for (const item of items) {
    if (item.kind === 'freehand') {
      for (let i = 0; i < item.points.length; i += 2) add(item.points[i], item.points[i + 1]);
    } else if (item.kind === 'connector') {
      const e = wbConnectorEnds(doc, item);
      add(e.x1, e.y1);
      add(e.x2, e.y2);
    } else {
      add(item.x, item.y);
      add(item.x + item.w, item.y + item.h);
    }
  }
  if (minX === Infinity) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
