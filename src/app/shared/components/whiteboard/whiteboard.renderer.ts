import {
  WBConnector,
  WBDocument,
  WBFreehand,
  WBItem,
  WBShape,
  WBViewport,
  WBGlyph,
} from './whiteboard.model';
import { wbBBox, wbConnectorEnds } from './whiteboard.geometry';

export interface WBRenderUI {
  selection: Set<string>;
  hoverId: string | null;
  rubber: { x1: number; y1: number; x2: number; y2: number } | null;
  connectorPreview: { x1: number; y1: number; x2: number; y2: number } | null;
  /** Shape the user is about to attach a connector/endpoint to. */
  highlightShapeId: string | null;
  hiddenTextId: string | null;
  showGrid: boolean;
  bg: string;
}

export interface WBRenderView {
  width: number; // css px
  height: number; // css px
  dpr: number;
}

const SELECTION = '#2563eb';
const INK_SOFT = '#334155';
const FONT = 'Inter, "Segoe UI", system-ui, sans-serif';

export class WhiteboardRenderer {
  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  render(doc: WBDocument, ui: WBRenderUI, view: WBRenderView): void {
    const ctx = this.ctx;
    const vp = doc.viewport;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, view.width * view.dpr, view.height * view.dpr);
    ctx.fillStyle = ui.bg;
    ctx.fillRect(0, 0, view.width * view.dpr, view.height * view.dpr);

    const s = view.dpr * vp.zoom;
    ctx.setTransform(s, 0, 0, s, view.dpr * vp.panX, view.dpr * vp.panY);

    if (ui.showGrid) this.grid(vp, view);

    for (const item of doc.items) {
      if (item.kind === 'freehand') this.freehand(item);
      else if (item.kind === 'connector') this.connector(doc, item, ui);
      else this.shape(item, ui, vp.zoom);
    }

    if (ui.highlightShapeId) {
      const target = doc.items.find((i) => i.id === ui.highlightShapeId);
      if (target && target.kind !== 'freehand' && target.kind !== 'connector') {
        this.shapeOverlay(target, vp.zoom, true);
      }
    }

    if (ui.connectorPreview) {
      ctx.save();
      ctx.strokeStyle = SELECTION;
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(ui.connectorPreview.x1, ui.connectorPreview.y1);
      ctx.lineTo(ui.connectorPreview.x2, ui.connectorPreview.y2);
      ctx.stroke();
      ctx.setLineDash([]);
      this.arrow(ui.connectorPreview.x1, ui.connectorPreview.y1, ui.connectorPreview.x2, ui.connectorPreview.y2, SELECTION);
      ctx.restore();
    }

    for (const id of ui.selection) {
      const item = doc.items.find((i) => i.id === id);
      if (!item) continue;
      if (item.kind === 'freehand') this.itemOverlay(doc, item, vp.zoom);
      else if (item.kind === 'connector') this.itemOverlay(doc, item, vp.zoom, true);
      else this.shapeOverlay(item, vp.zoom, true);
    }
    if (ui.hoverId && !ui.selection.has(ui.hoverId)) {
      const item = doc.items.find((i) => i.id === ui.hoverId);
      if (item) {
        if (item.kind === 'freehand' || item.kind === 'connector') this.itemOverlay(doc, item, vp.zoom);
        else this.shapeOverlay(item, vp.zoom, false);
      }
    }

    if (ui.rubber) {
      const r = this.norm(ui.rubber);
      ctx.save();
      ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
      ctx.strokeStyle = SELECTION;
      ctx.lineWidth = 1 / vp.zoom;
      ctx.setLineDash([5 / vp.zoom, 4 / vp.zoom]);
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.restore();
    }
  }

  private grid(vp: WBViewport, view: WBRenderView): void {
    const ctx = this.ctx;
    let spacing = 24;
    while (spacing * vp.zoom < 14) spacing *= 2;
    const x0 = -vp.panX / vp.zoom;
    const y0 = -vp.panY / vp.zoom;
    const x1 = x0 + view.width / vp.zoom;
    const y1 = y0 + view.height / vp.zoom;
    const major = spacing * 5;
    ctx.fillStyle = '#cbd5e1';
    for (let gx = Math.floor(x0 / spacing) * spacing; gx <= x1; gx += spacing) {
      for (let gy = Math.floor(y0 / spacing) * spacing; gy <= y1; gy += spacing) {
        const r = gx % major === 0 && gy % major === 0 ? 1.5 : 1;
        ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
      }
    }
  }
  private freehand(f: WBFreehand): void {
    const ctx = this.ctx;
    if (f.points.length < 4) return;
    ctx.save();
    ctx.strokeStyle = f.color;
    ctx.lineWidth = f.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(f.points[0], f.points[1]);
    for (let i = 2; i < f.points.length; i += 2) ctx.lineTo(f.points[i], f.points[i + 1]);
    ctx.stroke();
    ctx.restore();
  }

  private connector(doc: WBDocument, c: WBConnector, ui: WBRenderUI): void {
    const ctx = this.ctx;
    const e = wbConnectorEnds(doc, c);
    ctx.save();
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 2;
    if (c.dashed) ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(e.x1, e.y1);
    ctx.lineTo(e.x2, e.y2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (Math.hypot(e.x2 - e.x1, e.y2 - e.y1) > 14) {
      this.arrow(e.x1, e.y1, e.x2, e.y2, c.color);
      if (c.bidirectional) this.arrow(e.x2, e.y2, e.x1, e.y1, c.color);
    }
    if (c.label) {
      ctx.font = `600 12px ${FONT}`;
      const tw = ctx.measureText(c.label).width;
      const mx = (e.x1 + e.x2) / 2;
      const my = (e.y1 + e.y2) / 2;
      ctx.fillStyle = ui.bg;
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 1;
      this.rr(mx - tw / 2 - 7, my - 11, tw + 14, 22, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.label, mx, my);
    }
    ctx.restore();
  }

  private arrow(x1: number, y1: number, x2: number, y2: number, color: string): void {
    const ctx = this.ctx;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const size = Math.min(12, len / 2);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - ux * size - uy * size * 0.38, y2 - uy * size + ux * size * 0.38);
    ctx.lineTo(x2 - ux * size + uy * size * 0.38, y2 - uy * size - ux * size * 0.38);
    ctx.closePath();
    ctx.fill();
  }

  private norm(r: { x1: number; y1: number; x2: number; y2: number }) {
    return {
      x: Math.min(r.x1, r.x2),
      y: Math.min(r.y1, r.y2),
      w: Math.abs(r.x2 - r.x1),
      h: Math.abs(r.y2 - r.y1),
    };
  }

  /** Rounded-rect sub-path (call inside beginPath). */
  private rr(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    const rad = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.arcTo(x + w, y, x + w, y + rad, rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
    ctx.lineTo(x + rad, y + h);
    ctx.arcTo(x, y + h, x, y + h - rad, rad);
    ctx.lineTo(x, y + rad);
    ctx.arcTo(x, y, x + rad, y, rad);
    ctx.closePath();
  }
  private shape(s: WBShape, ui: WBRenderUI, _zoom: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = s.stroke;
    ctx.fillStyle = s.fill;
    if (s.dashed) ctx.setLineDash([7, 5]);
    switch (s.kind) {
      case 'text': {
        ctx.restore();
        this.shapeContent(s, 0, ui);
        return;
      }
      case 'rect':
        ctx.beginPath();
        ctx.rect(s.x, s.y, s.w, s.h);
        break;
      case 'rounded':
        ctx.beginPath();
        this.rr(s.x, s.y, s.w, s.h, 10);
        break;
      case 'ellipse':
        ctx.beginPath();
        ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
        break;
      case 'diamond': {
        const cx = s.x + s.w / 2;
        const cy = s.y + s.h / 2;
        ctx.beginPath();
        ctx.moveTo(cx, s.y);
        ctx.lineTo(s.x + s.w, cy);
        ctx.lineTo(cx, s.y + s.h);
        ctx.lineTo(s.x, cy);
        ctx.closePath();
        break;
      }
      case 'note': {
        const fold = 14;
        ctx.beginPath();
        this.rr(s.x, s.y, s.w, s.h, 6);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.10)';
        ctx.beginPath();
        ctx.moveTo(s.x + s.w - fold, s.y);
        ctx.lineTo(s.x + s.w, s.y + fold);
        ctx.lineTo(s.x + s.w, s.y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        this.shapeContent(s, 0, ui);
        return;
      }
      case 'cylinder': {
        const ry = Math.min(12, s.h / 5);
        const cx = s.x + s.w / 2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y + ry);
        ctx.lineTo(s.x, s.y + s.h - ry);
        ctx.ellipse(cx, s.y + s.h - ry, s.w / 2, ry, 0, Math.PI, 0, true);
        ctx.lineTo(s.x + s.w, s.y + ry);
        ctx.ellipse(cx, s.y + ry, s.w / 2, ry, 0, 0, Math.PI, false);
        ctx.closePath();
        break;
      }
    }
    ctx.fill();
    ctx.stroke();
    if (s.kind === 'cylinder') {
      const ry = Math.min(12, s.h / 5);
      ctx.beginPath();
      ctx.ellipse(s.x + s.w / 2, s.y + ry, s.w / 2, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    this.shapeContent(s, s.kind === 'cylinder' ? Math.min(12, s.h / 5) : 0, ui);
  }

  private shapeContent(s: WBShape, insetTop: number, ui: WBRenderUI): void {
    if (ui.hiddenTextId === s.id) return;
    const ctx = this.ctx;
    const text = s.text.trim();
    const hasGlyph = s.glyph !== 'none';
    const color = s.kind === 'text' ? s.stroke : s.kind === 'note' ? '#3f3f46' : INK_SOFT;
    const size = s.fontSize;

    if (s.kind === 'text' || s.kind === 'note') {
      if (!text) return;
      const pad = 12;
      const lines = this.wrapText(s.text, s.w - pad * 2, size);
      const lh = size * 1.35;
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = `500 ${size}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      let y = s.y + pad + lh / 2;
      for (const line of lines) {
        ctx.fillText(line, s.x + pad, y);
        y += lh;
      }
      ctx.restore();
      return;
    }

    if (!text && !hasGlyph) return;
    ctx.save();
    ctx.font = `500 ${size}px ${FONT}`;
    const pad = 14;
    const lines = text ? this.wrapText(text, s.w - pad * 2, size) : [];
    const lh = size * 1.35;
    const textH = lines.length * lh;
    const g = 22;
    const cx = s.x + s.w / 2;
    const insetBottom = s.kind === 'cylinder' ? Math.min(12, s.h / 5) : 0;
    const regionTop = s.y + insetTop;
    const regionH = s.h - insetTop - insetBottom;

    if (hasGlyph && lines.length && regionH < 64) {
      let maxW = 0;
      for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width);
      const total = g + 8 + maxW;
      const startX = cx - total / 2;
      const cyMid = regionTop + regionH / 2;
      ctx.lineWidth = 1.7;
      this.drawGlyph(s.glyph, startX + g / 2, cyMid, g, color);
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const startY = cyMid - ((lines.length - 1) * lh) / 2;
      lines.forEach((l, i) => ctx.fillText(l, startX + g + 8, startY + i * lh));
      ctx.restore();
      return;
    }

    let contentH = 0;
    if (hasGlyph && lines.length) contentH = g + 6 + textH;
    else if (hasGlyph) contentH = g;
    else contentH = textH;
    const top = regionTop + Math.max(0, (regionH - contentH) / 2);
    if (hasGlyph) this.drawGlyph(s.glyph, cx, top + g / 2, g, color);
    if (lines.length) {
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let y = top + (hasGlyph ? g + 6 : 0) + lh / 2;
      for (const l of lines) {
        ctx.fillText(l, cx, y);
        y += lh;
      }
    }
    ctx.restore();
  }

  private wrapText(text: string, maxWidth: number, size: number): string[] {
    const ctx = this.ctx;
    ctx.font = `500 ${size}px ${FONT}`;
    const out: string[] = [];
    for (const raw of text.split('\n')) {
      if (!raw.trim()) {
        out.push('');
        continue;
      }
      let line = '';
      for (const word of raw.split(/\s+/)) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width <= maxWidth || !line) {
          if (!line && ctx.measureText(word).width > maxWidth) {
            let chunk = '';
            for (const ch of word) {
              if (chunk && ctx.measureText(chunk + ch).width > maxWidth) {
                out.push(chunk);
                chunk = ch;
              } else {
                chunk += ch;
              }
            }
            line = chunk;
          } else {
            line = test;
          }
        } else {
          out.push(line);
          line = word;
        }
      }
      out.push(line);
    }
    return out;
  }
  private drawGlyph(glyph: WBGlyph, cx: number, cy: number, s: number, color: string): void {
    if (glyph === 'none') return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (glyph) {
      case 'user':
        ctx.arc(cx, cy - s * 0.18, s * 0.22, 0, Math.PI * 2);
        ctx.moveTo(cx - s * 0.36, cy + s * 0.42);
        ctx.arc(cx, cy + s * 0.42, s * 0.36, Math.PI, Math.PI * 2, false);
        break;
      case 'device':
        this.rr(cx - s * 0.26, cy - s * 0.44, s * 0.52, s * 0.88, 4);
        ctx.moveTo(cx + 1.8, cy + s * 0.3);
        ctx.arc(cx, cy + s * 0.3, 1.8, 0, Math.PI * 2);
        break;
      case 'cdn':
        ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
        ctx.moveTo(cx + s * 0.18, cy - s * 0.42);
        ctx.ellipse(cx, cy, s * 0.18, s * 0.42, 0, 0, Math.PI * 2);
        ctx.moveTo(cx - s * 0.42, cy);
        ctx.lineTo(cx + s * 0.42, cy);
        break;
      case 'lb':
        ctx.moveTo(cx, cy - s * 0.45);
        ctx.lineTo(cx, cy);
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - s * 0.4, cy + s * 0.42);
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy + s * 0.45);
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + s * 0.4, cy + s * 0.42);
        break;
      case 'gateway':
        ctx.moveTo(cx, cy - s * 0.45);
        ctx.lineTo(cx + s * 0.4, cy - s * 0.3);
        ctx.lineTo(cx + s * 0.4, cy + s * 0.1);
        ctx.quadraticCurveTo(cx + s * 0.4, cy + s * 0.4, cx, cy + s * 0.48);
        ctx.quadraticCurveTo(cx - s * 0.4, cy + s * 0.4, cx - s * 0.4, cy + s * 0.1);
        ctx.lineTo(cx - s * 0.4, cy - s * 0.3);
        ctx.closePath();
        break;
      case 'service': {
        const r1 = s * 0.2;
        const r2 = s * 0.42;
        ctx.arc(cx, cy, r1, 0, Math.PI * 2);
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
          ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        }
        break;
      }
      case 'cache':
        ctx.moveTo(cx + s * 0.1, cy - s * 0.48);
        ctx.lineTo(cx - s * 0.3, cy + s * 0.06);
        ctx.lineTo(cx - s * 0.02, cy + s * 0.06);
        ctx.lineTo(cx - s * 0.1, cy + s * 0.48);
        ctx.lineTo(cx + s * 0.3, cy - s * 0.06);
        ctx.lineTo(cx + s * 0.02, cy - s * 0.06);
        ctx.closePath();
        break;
      case 'sql': {
        const w2 = s * 0.36;
        const h2 = s * 0.36;
        ctx.moveTo(cx - w2, cy - h2);
        ctx.lineTo(cx - w2, cy + h2);
        ctx.ellipse(cx, cy + h2, w2, s * 0.12, 0, Math.PI, 0, true);
        ctx.lineTo(cx + w2, cy - h2);
        ctx.moveTo(cx - w2, cy - h2);
        ctx.ellipse(cx, cy - h2, w2, s * 0.12, 0, 0, Math.PI * 2);
        break;
      }
      case 'nosql':
        for (const dy of [-0.26, 0, 0.26]) {
          ctx.moveTo(cx + s * 0.36, cy + dy * s);
          ctx.ellipse(cx, cy + dy * s, s * 0.36, s * 0.13, 0, 0, Math.PI * 2);
        }
        break;
      case 'queue':
        for (const dy of [-0.26, 0, 0.26]) {
          ctx.moveTo(cx - s * 0.4, cy + dy * s);
          ctx.lineTo(cx + s * 0.4, cy + dy * s);
        }
        break;
      case 'storage':
        ctx.moveTo(cx - s * 0.34, cy - s * 0.28);
        ctx.lineTo(cx - s * 0.22, cy + s * 0.44);
        ctx.lineTo(cx + s * 0.22, cy + s * 0.44);
        ctx.lineTo(cx + s * 0.34, cy - s * 0.28);
        ctx.moveTo(cx - s * 0.34, cy - s * 0.28);
        ctx.ellipse(cx, cy - s * 0.28, s * 0.34, s * 0.11, 0, 0, Math.PI * 2);
        break;
      case 'ws':
        ctx.moveTo(cx + 1.8, cy + s * 0.28);
        ctx.arc(cx, cy + s * 0.28, 1.8, 0, Math.PI * 2);
        ctx.moveTo(cx - s * 0.24, cy + s * 0.04);
        ctx.arc(cx, cy + s * 0.28, s * 0.36, Math.PI * 1.25, Math.PI * 1.75);
        ctx.moveTo(cx - s * 0.42, cy - s * 0.16);
        ctx.arc(cx, cy + s * 0.28, s * 0.58, Math.PI * 1.28, Math.PI * 1.72);
        break;
      case 'auth':
        this.rr(cx - s * 0.28, cy - s * 0.04, s * 0.56, s * 0.44, 4);
        ctx.moveTo(cx - s * 0.16, cy - s * 0.04);
        ctx.lineTo(cx - s * 0.16, cy - s * 0.18);
        ctx.arc(cx, cy - s * 0.18, s * 0.16, Math.PI, Math.PI * 2, false);
        break;
      case 'api':
        ctx.moveTo(cx - s * 0.04, cy - s * 0.42);
        ctx.lineTo(cx - s * 0.38, cy);
        ctx.lineTo(cx - s * 0.04, cy + s * 0.42);
        ctx.moveTo(cx + s * 0.04, cy - s * 0.42);
        ctx.lineTo(cx + s * 0.38, cy);
        ctx.lineTo(cx + s * 0.04, cy + s * 0.42);
        break;
    }
    ctx.stroke();
    ctx.restore();
  }

  private shapeOverlay(s: WBShape, zoom: number, selected: boolean): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = 1.5 / zoom;
    ctx.strokeStyle = selected ? SELECTION : 'rgba(37, 99, 235, 0.55)';
    if (!selected) ctx.setLineDash([4 / zoom, 3 / zoom]);
    ctx.strokeRect(s.x, s.y, s.w, s.h);
    if (selected) {
      const hs = 4 / zoom;
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff';
      for (const hx of [s.x, s.x + s.w / 2, s.x + s.w]) {
        for (const hy of [s.y, s.y + s.h / 2, s.y + s.h]) {
          if (hx === s.x + s.w / 2 && hy === s.y + s.h / 2) continue;
          ctx.fillRect(hx - hs, hy - hs, hs * 2, hs * 2);
          ctx.strokeRect(hx - hs, hy - hs, hs * 2, hs * 2);
        }
      }
    }
    ctx.restore();
  }

  private itemOverlay(doc: WBDocument, item: WBItem, zoom: number, endHandles = false): void {
    const ctx = this.ctx;
    ctx.save();
    if (item.kind === 'connector' && endHandles) {
      // Selected arrow: draggable endpoint handles instead of a bounding box.
      const e = wbConnectorEnds(doc, item);
      this.endHandle(e.x1, e.y1, !!item.from, zoom);
      this.endHandle(e.x2, e.y2, !!item.to, zoom);
      ctx.restore();
      return;
    }
    const b = wbBBox(doc, [item]);
    if (!b) {
      ctx.restore();
      return;
    }
    ctx.lineWidth = 1.5 / zoom;
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.7)';
    ctx.setLineDash([4 / zoom, 3 / zoom]);
    ctx.strokeRect(b.x - 4 / zoom, b.y - 4 / zoom, b.w + 8 / zoom, b.h + 8 / zoom);
    ctx.restore();
  }

  /** Round grab handle at a connector end; filled dot when attached to a shape. */
  private endHandle(x: number, y: number, attached: boolean, zoom: number): void {
    const ctx = this.ctx;
    const r = 4.5 / zoom;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 1.5 / zoom;
    ctx.strokeStyle = SELECTION;
    ctx.stroke();
    if (attached) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(r * 0.42, 1.4 / zoom), 0, Math.PI * 2);
      ctx.fillStyle = SELECTION;
      ctx.fill();
    }
  }
}



