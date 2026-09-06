/**
 * Whiteboard data model — plain serializable types so a document can be
 * persisted (localStorage today, a sync service later) without Angular state.
 */
export type WBTool = 'select' | 'pen' | 'connector' | 'text' | 'eraser' | 'pan';

export type WBShapeKind =
  | 'rect'
  | 'rounded'
  | 'cylinder'
  | 'diamond'
  | 'ellipse'
  | 'note'
  | 'text';

/** Small vector glyphs drawn inside shapes (system-design component icons). */
export type WBGlyph =
  | 'none'
  | 'user'
  | 'device'
  | 'cdn'
  | 'lb'
  | 'gateway'
  | 'service'
  | 'cache'
  | 'sql'
  | 'nosql'
  | 'queue'
  | 'storage'
  | 'ws'
  | 'auth'
  | 'api';

export interface WBViewport {
  panX: number;
  panY: number;
  zoom: number;
}

/** Rectangles, cylinders (databases), sticky notes, plain text, etc. */
export interface WBShape {
  id: string;
  kind: WBShapeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  fill: string;
  stroke: string;
  glyph: WBGlyph;
  fontSize: number;
  dashed: boolean;
}

/** Freehand pen strokes. */
export interface WBFreehand {
  id: string;
  kind: 'freehand';
  points: number[]; // flattened x,y pairs in world coordinates
  color: string;
  width: number;
}

/** Arrows with optional labels; ends can attach to shapes by id. */
export interface WBConnector {
  id: string;
  kind: 'connector';
  from: string | null; // attached shape id (null = free end)
  to: string | null;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  color: string;
  dashed: boolean;
  bidirectional: boolean;
}

export type WBItem = WBShape | WBFreehand | WBConnector;

export interface WBDocument {
  version: 1;
  items: WBItem[];
  viewport: WBViewport;
}

export const WB_STORAGE_PREFIX = 'wb-doc:';
export const WB_INK = '#0f172a';

export interface WBPaletteEntry {
  color: string;
  tint: string;
  name: string;
}

export const WB_COLORS: WBPaletteEntry[] = [
  { color: '#0f172a', tint: '#ffffff', name: 'Ink' },
  { color: '#2563eb', tint: '#eff6ff', name: 'Blue' },
  { color: '#059669', tint: '#ecfdf5', name: 'Green' },
  { color: '#d97706', tint: '#fffbeb', name: 'Amber' },
  { color: '#dc2626', tint: '#fef2f2', name: 'Red' },
  { color: '#7c3aed', tint: '#f5f3ff', name: 'Purple' },
  { color: '#0891b2', tint: '#ecfeff', name: 'Cyan' },
];

export function wbTintFor(color: string): string {
  return WB_COLORS.find((c) => c.color === color)?.tint ?? '#ffffff';
}

let wbSeq = 0;
export function wbNewId(): string {
  return `wb-${Date.now().toString(36)}-${(wbSeq++).toString(36)}`;
}

export function wbEmptyDocument(): WBDocument {
  return { version: 1, items: [], viewport: { panX: 0, panY: 0, zoom: 1 } };
}

export function wbShape(
  kind: WBShapeKind,
  x: number,
  y: number,
  w: number,
  h: number,
  text = '',
  opts: Partial<WBShape> = {},
): WBShape {
  return {
    id: wbNewId(),
    kind,
    x,
    y,
    w,
    h,
    text,
    fill: '#ffffff',
    stroke: WB_INK,
    glyph: 'none',
    fontSize: 15,
    dashed: false,
    ...opts,
  };
}

export interface WBStencil {
  id: string;
  label: string;
  group: 'Basics' | 'Edge & Compute' | 'Data & Async';
  kind: WBShapeKind;
  glyph: WBGlyph;
  text: string;
  w: number;
  h: number;
}

/** Drag-and-drop style component library for system design boards. */
export const WB_STENCILS: WBStencil[] = [
  // Basics
  { id: 'basic-rect', label: 'Rectangle', group: 'Basics', kind: 'rect', glyph: 'none', text: '', w: 180, h: 80 },
  { id: 'basic-rounded', label: 'Rounded box', group: 'Basics', kind: 'rounded', glyph: 'none', text: '', w: 180, h: 80 },
  { id: 'basic-ellipse', label: 'Ellipse', group: 'Basics', kind: 'ellipse', glyph: 'none', text: '', w: 160, h: 90 },
  { id: 'basic-diamond', label: 'Decision', group: 'Basics', kind: 'diamond', glyph: 'none', text: '', w: 170, h: 100 },
  { id: 'basic-note', label: 'Sticky note', group: 'Basics', kind: 'note', glyph: 'none', text: '', w: 190, h: 120 },
  { id: 'basic-text', label: 'Text', group: 'Basics', kind: 'text', glyph: 'none', text: '', w: 180, h: 40 },
  // Edge & Compute
  { id: 'client', label: 'Client', group: 'Edge & Compute', kind: 'ellipse', glyph: 'user', text: 'Client', w: 150, h: 70 },
  { id: 'app', label: 'Web / Mobile App', group: 'Edge & Compute', kind: 'rounded', glyph: 'device', text: 'Web / Mobile App', w: 170, h: 70 },
  { id: 'cdn', label: 'CDN', group: 'Edge & Compute', kind: 'rounded', glyph: 'cdn', text: 'CDN', w: 130, h: 60 },
  { id: 'lb', label: 'Load Balancer', group: 'Edge & Compute', kind: 'rounded', glyph: 'lb', text: 'Load Balancer', w: 160, h: 60 },
  { id: 'gateway', label: 'API Gateway', group: 'Edge & Compute', kind: 'rounded', glyph: 'gateway', text: 'API Gateway', w: 150, h: 60 },
  { id: 'service', label: 'App Service', group: 'Edge & Compute', kind: 'rect', glyph: 'service', text: 'App Service', w: 160, h: 70 },
  { id: 'auth', label: 'Auth Service', group: 'Edge & Compute', kind: 'rect', glyph: 'auth', text: 'Auth Service', w: 150, h: 64 },
  { id: 'ws-server', label: 'WebSocket Server', group: 'Edge & Compute', kind: 'rect', glyph: 'ws', text: 'WebSocket Server', w: 180, h: 64 },
  { id: 'ext-api', label: 'External API', group: 'Edge & Compute', kind: 'rect', glyph: 'api', text: 'External API', w: 150, h: 64 },
  // Data & Async
  { id: 'cache', label: 'Cache (Redis)', group: 'Data & Async', kind: 'cylinder', glyph: 'cache', text: 'Cache (Redis)', w: 150, h: 80 },
  { id: 'sql', label: 'SQL Database', group: 'Data & Async', kind: 'cylinder', glyph: 'sql', text: 'SQL Database', w: 160, h: 92 },
  { id: 'nosql', label: 'NoSQL Database', group: 'Data & Async', kind: 'cylinder', glyph: 'nosql', text: 'NoSQL Database', w: 160, h: 92 },
  { id: 'queue', label: 'Message Queue', group: 'Data & Async', kind: 'rounded', glyph: 'queue', text: 'Message Queue', w: 170, h: 64 },
  { id: 'storage', label: 'Object Storage', group: 'Data & Async', kind: 'cylinder', glyph: 'storage', text: 'Object Storage', w: 160, h: 92 },
];

/** Example high-level design shown on first open — mirrors the real interview flow. */
export function wbStarterDocument(): WBDocument {
  const note = wbShape('note', 40, 40, 280, 116, 'Requirements\n• 10M DAU, read-heavy\n• p99 < 300ms\n• Highly available', {
    fill: '#fef9c3',
    stroke: '#ca8a04',
    fontSize: 13,
  });
  const client = wbShape('ellipse', 60, 250, 150, 70, 'Client', { glyph: 'user', fill: '#eff6ff', stroke: '#2563eb' });
  const lb = wbShape('rounded', 290, 255, 150, 60, 'Load Balancer', { glyph: 'lb', fill: '#eff6ff', stroke: '#2563eb' });
  const api = wbShape('rounded', 520, 255, 160, 60, 'App Service', { glyph: 'service', fill: '#eff6ff', stroke: '#2563eb' });
  const cache = wbShape('cylinder', 520, 80, 150, 82, 'Cache (Redis)', { glyph: 'cache', fill: '#fffbeb', stroke: '#d97706' });
  const db = wbShape('cylinder', 520, 410, 160, 92, 'SQL Database', { glyph: 'sql', fill: '#ecfdf5', stroke: '#059669' });
  const queue = wbShape('rounded', 770, 414, 170, 64, 'Message Queue', { glyph: 'queue', fill: '#f5f3ff', stroke: '#7c3aed' });
  const worker = wbShape('rect', 1010, 414, 160, 64, 'Worker', { glyph: 'service', fill: '#eff6ff', stroke: '#2563eb' });
  const storage = wbShape('cylinder', 1010, 250, 160, 92, 'Object Storage', { glyph: 'storage', fill: '#ecfeff', stroke: '#0891b2' });
  const items: WBItem[] = [
    note,
    client,
    lb,
    api,
    cache,
    db,
    queue,
    worker,
    storage,
    wbLink('c1', client.id, lb.id, 'HTTPS'),
    wbLink('c2', lb.id, api.id, ''),
    wbLink('c3', api.id, cache.id, 'read / write'),
    wbLink('c4', api.id, db.id, ''),
    wbLink('c5', api.id, queue.id, 'publish'),
    wbLink('c6', queue.id, worker.id, ''),
    wbLink('c7', worker.id, storage.id, ''),
  ];
  return { version: 1, items, viewport: { panX: 40, panY: 30, zoom: 1 } };
}

function wbLink(tag: string, from: string, to: string, label: string): WBConnector {
  return {
    id: 'wb-link-' + tag,
    kind: 'connector',
    from,
    to,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    label,
    color: '#475569',
    dashed: false,
    bidirectional: false,
  };
}

