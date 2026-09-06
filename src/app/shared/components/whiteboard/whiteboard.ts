import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  WB_COLORS,
  WB_INK,
  WB_STENCILS,
  WB_STORAGE_PREFIX,
  WBConnector,
  WBDocument,
  WBItem,
  WBShape,
  WBStencil,
  WBTool,
  WBViewport,
  wbEmptyDocument,
  wbNewId,
  wbShape,
  wbStarterDocument,
  wbTintFor,
} from './whiteboard.model';
import { WhiteboardRenderer } from './whiteboard.renderer';
import {
  WB_HANDLE_CURSORS,
  wbAnchor,
  wbBBox,
  wbConnectorEnds,
  wbConnectorHandleAt,
  wbHandleAt,
  wbHitTest,
  wbShapeAt,
} from './whiteboard.geometry';

type WBDragMode =
  | 'idle'
  | 'pan'
  | 'move'
  | 'resize'
  | 'rubber'
  | 'draw'
  | 'connect'
  | 'endpoint'
  | 'erase';

interface WBEditorState {
  id: string;
  isLabel: boolean;
}

@Component({
  selector: 'app-whiteboard',
  templateUrl: './whiteboard.html',
  styleUrl: './whiteboard.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class Whiteboard implements OnDestroy {
  /** Unique autosave key — use one board per page/problem. */
  readonly storageKey = input('default');

  private readonly zone = inject(NgZone);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly wrapRef = viewChild.required<ElementRef<HTMLDivElement>>('wrap');
  private readonly editorRef = viewChild<ElementRef<HTMLTextAreaElement>>('wbEditor');
  private readonly ctxToolbarRef = viewChild<ElementRef<HTMLDivElement>>('ctxToolbar');
  private readonly hostRef = inject(ElementRef);

  private renderer: WhiteboardRenderer | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private ro: ResizeObserver | null = null;
  private doc: WBDocument = wbEmptyDocument();
  private dpr = 1;
  private viewW = 0;
  private viewH = 0;
  private rafId = 0;
  private needsRender = false;

  // interaction state
  private mode: WBDragMode = 'idle';
  private selection = new Set<string>();
  private hoverId: string | null = null;
  private spaceDown = false;
  private moved = false;
  private dragStart = { x: 0, y: 0 };
  private dragLast = { x: 0, y: 0 };
  private downClient = { x: 0, y: 0 };
  private panStart = { x: 0, y: 0 };
  private resizeOriginal: WBShape | null = null;
  private resizeHandle = '';
  private pendingConnector: { fromId: string | null; x: number; y: number } | null = null;
  private connectTarget: string | null = null;
  private connectorPreview: { x1: number; y1: number; x2: number; y2: number } | null = null;
  private currentStroke: number[] = [];
  private erasedAny = false;
  private rubber: { x1: number; y1: number; x2: number; y2: number } | null = null;
  private endpointDrag: { id: string; end: 'p1' | 'p2'; target: string | null } | null = null;
  private highlightId: string | null = null;

  // history & persistence
  private history: string[] = [];
  private historyIndex = -1;
  private lastCommit = { label: '', time: 0 };
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  // template state
  readonly tool = signal<WBTool>('select');
  readonly activeColor = signal(WB_INK);
  readonly strokeWidth = signal(2.5);
  readonly zoom = signal(100);
  readonly selectionCount = signal(0);
  readonly itemCount = signal(0);
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);
  readonly editing = signal<WBEditorState | null>(null);
  readonly helpOpen = signal(false);
  readonly fullscreen = signal(false);
  readonly placing = signal<WBStencil | null>(null);
  readonly saved = signal(true);
  /** Floating context toolbar state for a single selected connector (arrow). */
  readonly ctxConn = signal<{ id: string; bidirectional: boolean; dashed: boolean } | null>(null);
  readonly colors = WB_COLORS;
  readonly widths = [2, 3.5, 5.5];
  readonly stencilGroups: WBStencil['group'][] = ['Basics', 'Edge & Compute', 'Data & Async'];

  readonly hint = computed(() => {
    const p = this.placing();
    if (p) return `Click on the canvas to place "${p.label}" — Esc to cancel`;
    switch (this.tool()) {
      case 'select':
        return 'Drag to move • Select an arrow and drag its end handles to re-attach • Double-click to edit • Del to delete • Space + drag to pan';
      case 'pen':
        return 'Draw freehand — release to finish the stroke';
      case 'connector':
        return 'Drag from one shape to another to connect • double-click an arrow to label it';
      case 'text':
        return 'Click on the canvas to write text';
      case 'eraser':
        return 'Click or sweep over elements to erase them';
      case 'pan':
        return 'Drag to pan the board';
    }
  });

  constructor() {
    afterNextRender(() => this.setup());
  }

  ngOnDestroy(): void {
    const canvas = this.canvasEl;
    if (canvas) {
      canvas.removeEventListener('pointerdown', this.onPointerDown);
      canvas.removeEventListener('dblclick', this.onDblClick);
      canvas.removeEventListener('wheel', this.onWheel);
    }
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.ro?.disconnect();
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.saveTimer) clearTimeout(this.saveTimer);
  }

  // ===== Bootstrap =====

  private setup(): void {
    this.zone.runOutsideAngular(() => {
      const canvas = this.canvasRef().nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      this.canvasEl = canvas;
      this.renderer = new WhiteboardRenderer(ctx);

      this.ro = new ResizeObserver(() => this.onResize());
      this.ro.observe(this.wrapRef().nativeElement);
      this.onResize();

      canvas.addEventListener('pointerdown', this.onPointerDown);
      window.addEventListener('pointermove', this.onPointerMove);
      window.addEventListener('pointerup', this.onPointerUp);
      canvas.addEventListener('dblclick', this.onDblClick);
      canvas.addEventListener('wheel', this.onWheel, { passive: false });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);

      this.doc = this.loadSaved() ?? wbStarterDocument();
      this.commit('init', undefined, true);
      this.inZone(() => this.itemCount.set(this.doc.items.length));
      this.scheduleRender();
    });
  }
  // ===== Rendering =====

  private onResize(): void {
    const wrap = this.wrapRef().nativeElement;
    const canvas = this.canvasEl;
    if (!canvas) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.viewW = wrap.clientWidth;
    this.viewH = wrap.clientHeight;
    canvas.width = Math.max(1, Math.round(this.viewW * this.dpr));
    canvas.height = Math.max(1, Math.round(this.viewH * this.dpr));
    canvas.style.width = `${this.viewW}px`;
    canvas.style.height = `${this.viewH}px`;
    this.scheduleRender();
  }

  private scheduleRender(): void {
    if (this.rafId) {
      this.needsRender = true;
      return;
    }
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      this.render();
      if (this.needsRender) {
        this.needsRender = false;
        this.scheduleRender();
      }
    });
  }

  private render(): void {
    if (!this.renderer) return;
    this.renderer.render(
      this.doc,
      {
        selection: this.selection,
        hoverId: this.hoverId,
        rubber: this.rubber,
        connectorPreview: this.connectorPreview,
        highlightShapeId: this.highlightId,
        hiddenTextId: this.editing()?.id ?? null,
        showGrid: true,
        bg: '#f8fafc',
      },
      { width: this.viewW, height: this.viewH, dpr: this.dpr },
    );
    this.positionEditor();
    this.positionConnectorToolbar();
  }

  /** Keeps the arrow context toolbar glued to the selected connector's midpoint. */
  private positionConnectorToolbar(): void {
    const el = this.ctxToolbarRef()?.nativeElement;
    if (!el) return;
    const cc = this.ctxConn();
    if (!cc) {
      el.style.visibility = 'hidden';
      return;
    }
    const item = this.doc.items.find((i) => i.id === cc.id);
    if (!item || item.kind !== 'connector' || this.mode === 'endpoint' || this.editing()?.id === cc.id) {
      el.style.visibility = 'hidden';
      return;
    }
    const ends = wbConnectorEnds(this.doc, item);
    const vp = this.doc.viewport;
    const x = ((ends.x1 + ends.x2) / 2) * vp.zoom + vp.panX;
    const y = ((ends.y1 + ends.y2) / 2) * vp.zoom + vp.panY;
    const above = y > 70;
    el.style.visibility = 'visible';
    el.style.left = `${Math.min(Math.max(x, 60), Math.max(60, this.viewW - 60))}px`;
    el.style.top = `${y}px`;
    el.style.transform = above ? 'translate(-50%, calc(-100% - 14px))' : 'translate(-50%, 14px)';
  }

  /** Keeps the inline text editor glued to its item while panning/zooming. */
  private positionEditor(): void {
    const ed = this.editing();
    const el = this.editorRef()?.nativeElement;
    if (!ed || !el) return;
    const item = this.doc.items.find((i) => i.id === ed.id);
    if (!item || item.kind === 'freehand') {
      this.inZone(() => this.editing.set(null));
      return;
    }
    const vp = this.doc.viewport;
    let left: number;
    let top: number;
    let width: number;
    let height: number;
    let font: number;
    let color: string;
    if (item.kind === 'connector') {
      const ends = wbConnectorEnds(this.doc, item);
      const x = ((ends.x1 + ends.x2) / 2) * vp.zoom + vp.panX;
      const y = ((ends.y1 + ends.y2) / 2) * vp.zoom + vp.panY;
      width = 190;
      height = 40;
      font = 13;
      color = item.color;
      left = x - width / 2;
      top = y - height / 2;
    } else {
      left = item.x * vp.zoom + vp.panX;
      top = item.y * vp.zoom + vp.panY;
      width = Math.max(item.w * vp.zoom, 60);
      height = Math.max(item.h * vp.zoom, 34);
      font = Math.max(10, item.fontSize * vp.zoom);
      color = item.kind === 'text' ? item.stroke : '#334155';
    }
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.fontSize = `${font}px`;
    el.style.color = color;
  }

  // ===== Coordinate & selection helpers =====

  private toWorld(e: PointerEvent | WheelEvent | MouseEvent): { x: number; y: number } {
    const rect = this.canvasEl!.getBoundingClientRect();
    const vp = this.doc.viewport;
    return {
      x: (e.clientX - rect.left - vp.panX) / vp.zoom,
      y: (e.clientY - rect.top - vp.panY) / vp.zoom,
    };
  }

  private inZone(fn: () => void): void {
    this.zone.run(fn);
  }

  private syncSelection(): void {
    const n = this.selection.size;
    if (this.selectionCount() !== n) this.inZone(() => this.selectionCount.set(n));
    this.syncCtxConn();
  }

  /** Refresh the floating connector toolbar (null unless one arrow is selected). */
  private syncCtxConn(): void {
    let next: { id: string; bidirectional: boolean; dashed: boolean } | null = null;
    if (this.selection.size === 1) {
      const item = this.doc.items.find((i) => i.id === [...this.selection][0]);
      if (item && item.kind === 'connector') {
        next = { id: item.id, bidirectional: item.bidirectional, dashed: item.dashed };
      }
    }
    this.inZone(() => this.ctxConn.set(next));
  }

  private updateCursor(): void {
    if (!this.canvasEl) return;
    if (this.placing()) {
      this.canvasEl.style.cursor = 'crosshair';
      return;
    }
    const t = this.tool();
    this.canvasEl.style.cursor = t === 'pan' ? 'grab' : t === 'select' ? 'default' : 'crosshair';
  }

  private singleSelectedShape(): WBShape | null {
    if (this.selection.size !== 1) return null;
    const item = this.doc.items.find((i) => i.id === [...this.selection][0]);
    return item && item.kind !== 'freehand' && item.kind !== 'connector' ? item : null;
  }

  private endCoords(
    shapeId: string | null,
    toward: { x: number; y: number },
  ): { x: number; y: number } | null {
    if (!shapeId) return null;
    const item = this.doc.items.find((i) => i.id === shapeId);
    if (!item || item.kind === 'freehand' || item.kind === 'connector') return null;
    return wbAnchor(item, toward.x, toward.y);
  }

  private translateItem(item: WBItem, dx: number, dy: number): void {
    if (item.kind === 'freehand') {
      for (let i = 0; i < item.points.length; i += 2) {
        item.points[i] += dx;
        item.points[i + 1] += dy;
      }
    } else if (item.kind === 'connector') {
      item.x1 += dx;
      item.y1 += dy;
      item.x2 += dx;
      item.y2 += dy;
    } else {
      item.x += dx;
      item.y += dy;
    }
  }

  // ===== Public API =====

  /** Replace the whole board programmatically (e.g. load a saved artifact). */
  loadDocument(doc: WBDocument): void {
    this.doc = JSON.parse(JSON.stringify(doc)) as WBDocument;
    this.selection = new Set();
    this.syncSelection();
    this.history = [];
    this.historyIndex = -1;
    this.commit('load');
    this.inZone(() => this.itemCount.set(this.doc.items.length));
    this.scheduleRender();
  }

  /** Snapshot of the current document for saving/syncing elsewhere. */
  getDocument(): WBDocument {
    return JSON.parse(JSON.stringify(this.doc)) as WBDocument;
  }

  private loadSaved(): WBDocument | null {
    try {
      const raw = localStorage.getItem(WB_STORAGE_PREFIX + this.storageKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw) as WBDocument;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.items)) return parsed;
    } catch {
      /* corrupted or unavailable storage */
    }
    return null;
  }
  // ===== Pointer handling =====

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (!this.canvasEl) return;
    if (this.editing()) this.closeEditor(true);
    if (e.button === 1) e.preventDefault();
    try {
      this.canvasEl.setPointerCapture(e.pointerId);
    } catch {
      /* capture not available for this pointer — window-level move/up listeners keep dragging working */
    }
    const w = this.toWorld(e);
    const vp = this.doc.viewport;
    this.dragStart = { ...w };
    this.dragLast = { ...w };
    this.downClient = { x: e.clientX, y: e.clientY };
    this.moved = false;

    if (e.button === 1 || this.spaceDown || this.tool() === 'pan') {
      this.mode = 'pan';
      this.panStart = { x: vp.panX, y: vp.panY };
      this.canvasEl.style.cursor = 'grabbing';
      return;
    }

    if (this.placing()) {
      this.placeStencil(w);
      return;
    }

    switch (this.tool()) {
      case 'pen':
        this.mode = 'draw';
        this.currentStroke = [w.x, w.y];
        return;
      case 'connector': {
        const shape = wbShapeAt(this.doc, w.x, w.y, 6 / vp.zoom);
        this.mode = 'connect';
        this.pendingConnector = { fromId: shape?.id ?? null, x: w.x, y: w.y };
        this.connectTarget = null;
        return;
      }
      case 'text': {
        const item = wbShape('text', w.x, w.y, 180, 36, '', {
          fontSize: 16,
          stroke: this.activeColor(),
          fill: 'transparent',
        });
        this.doc.items.push(item);
        this.selection = new Set([item.id]);
        this.syncSelection();
        this.openEditor(item.id, false);
        return;
      }
      case 'eraser':
        this.mode = 'erase';
        this.erasedAny = this.eraseAt(w);
        return;
      case 'pan':
        return;
      case 'select':
        break;
    }

    // Grab an endpoint handle of the selected arrow (re-attach / detach ends).
    if (this.selection.size === 1) {
      const sel = this.doc.items.find((i) => i.id === [...this.selection][0]);
      if (sel && sel.kind === 'connector') {
        const end = wbConnectorHandleAt(this.doc, sel, w.x, w.y, vp.zoom);
        if (end) {
          this.mode = 'endpoint';
          this.endpointDrag = { id: sel.id, end, target: null };
          return;
        }
      }
    }

    const single = this.singleSelectedShape();
    if (single) {
      const handle = wbHandleAt(single, w.x, w.y, vp.zoom);
      if (handle) {
        this.mode = 'resize';
        this.resizeHandle = handle;
        this.resizeOriginal = JSON.parse(JSON.stringify(single)) as WBShape;
        return;
      }
    }

    const hit = wbHitTest(this.doc, w.x, w.y, 6 / vp.zoom);
    if (hit) {
      if (e.shiftKey) {
        if (this.selection.has(hit.id)) this.selection.delete(hit.id);
        else this.selection.add(hit.id);
      } else if (!this.selection.has(hit.id)) {
        this.selection = new Set([hit.id]);
      }
      this.syncSelection();
      this.mode = 'move';
      this.scheduleRender();
      return;
    }

    if (!e.shiftKey) {
      this.selection = new Set();
      this.syncSelection();
    }
    this.mode = 'rubber';
    this.rubber = { x1: w.x, y1: w.y, x2: w.x, y2: w.y };
    this.scheduleRender();
  };

  private placeStencil(w: { x: number; y: number }): void {
    const st = this.placing();
    if (!st) return;
    const color = this.activeColor();
    const item = wbShape(
      st.kind,
      Math.round((w.x - st.w / 2) / 8) * 8,
      Math.round((w.y - st.h / 2) / 8) * 8,
      st.w,
      st.h,
      st.text,
      {
        glyph: st.glyph,
        fill: st.kind === 'text' ? 'transparent' : wbTintFor(color),
        stroke: st.kind === 'note' ? '#ca8a04' : color,
        fontSize: st.kind === 'text' ? 16 : 15,
      },
    );
    this.doc.items.push(item);
    this.selection = new Set([item.id]);
    this.inZone(() => {
      this.placing.set(null);
      this.tool.set('select');
      this.syncSelection();
    });
    this.updateCursor();
    this.commit('place');
    this.scheduleRender();
  }

  private eraseAt(w: { x: number; y: number }): boolean {
    const hit = wbHitTest(this.doc, w.x, w.y, 6 / this.doc.viewport.zoom);
    if (!hit) return false;
    this.doc.items = this.doc.items.filter((i) => i.id !== hit.id);
    this.selection.delete(hit.id);
    this.pruneDanglingConnectors();
    this.syncSelection();
    this.scheduleRender();
    return true;
  }

  private pruneDanglingConnectors(): void {
    const alive = (id: string | null) => !id || this.doc.items.some((i) => i.id === id);
    this.doc.items = this.doc.items.filter(
      (i) => i.kind !== 'connector' || (alive(i.from) && alive(i.to)),
    );
  }
  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.canvasEl) return;
    const w = this.toWorld(e);
    const vp = this.doc.viewport;

    switch (this.mode) {
      case 'pan': {
        this.doc.viewport.panX = this.panStart.x + (e.clientX - this.downClient.x);
        this.doc.viewport.panY = this.panStart.y + (e.clientY - this.downClient.y);
        this.scheduleRender();
        return;
      }
      case 'move': {
        const dx = w.x - this.dragLast.x;
        const dy = w.y - this.dragLast.y;
        if (dx || dy) {
          this.moved = true;
          for (const id of this.selection) {
            const item = this.doc.items.find((i) => i.id === id);
            if (item) this.translateItem(item, dx, dy);
          }
          this.dragLast = { ...w };
          this.scheduleRender();
        }
        return;
      }
      case 'resize':
        this.applyResize(w);
        return;
      case 'draw': {
        const n = this.currentStroke.length;
        if (n >= 2) {
          const dist = Math.hypot(w.x - this.currentStroke[n - 2], w.y - this.currentStroke[n - 1]);
          if (dist > 1.5 / vp.zoom) {
            this.currentStroke.push(w.x, w.y);
            this.moved = true;
            this.scheduleRender();
          }
        }
        return;
      }
      case 'connect': {
        const start = this.pendingConnector;
        if (!start) return;
        const target = wbShapeAt(this.doc, w.x, w.y, 6 / vp.zoom);
        this.connectTarget = target && target.id !== start.fromId ? target.id : null;
        this.highlightId = this.connectTarget;
        const end = this.endCoords(this.connectTarget, { x: start.x, y: start.y }) ?? w;
        const startPt = this.endCoords(start.fromId, { x: w.x, y: w.y }) ?? { x: start.x, y: start.y };
        this.connectorPreview = { x1: startPt.x, y1: startPt.y, x2: end.x, y2: end.y };
        if (Math.hypot(w.x - start.x, w.y - start.y) > 3) this.moved = true;
        this.scheduleRender();
        return;
      }
      case 'endpoint': {
        const d = this.endpointDrag;
        if (!d) return;
        const c = this.doc.items.find((i) => i.id === d.id);
        if (!c || c.kind !== 'connector') return;
        if (Math.hypot(w.x - this.dragStart.x, w.y - this.dragStart.y) <= 2 / vp.zoom) return;
        // Detach while dragging; re-attach only if dropped on a (different) shape.
        const target = wbShapeAt(this.doc, w.x, w.y, 6 / vp.zoom);
        const otherId = d.end === 'p1' ? c.to : c.from;
        d.target = target && target.id !== otherId ? target.id : null;
        const otherPt =
          this.endCoords(otherId, { x: w.x, y: w.y }) ??
          (d.end === 'p1' ? { x: c.x2, y: c.y2 } : { x: c.x1, y: c.y1 });
        const pt = d.target ? (this.endCoords(d.target, otherPt) ?? w) : w;
        if (d.end === 'p1') {
          c.from = null;
          c.x1 = pt.x;
          c.y1 = pt.y;
        } else {
          c.to = null;
          c.x2 = pt.x;
          c.y2 = pt.y;
        }
        this.highlightId = d.target;
        this.moved = true;
        this.scheduleRender();
        return;
      }
      case 'rubber': {
        if (!this.rubber) return;
        this.rubber.x2 = w.x;
        this.rubber.y2 = w.y;
        if (Math.abs(w.x - this.dragStart.x) > 2 || Math.abs(w.y - this.dragStart.y) > 2) this.moved = true;
        this.scheduleRender();
        return;
      }
      case 'erase':
        if (this.eraseAt(w)) this.erasedAny = true;
        return;
      case 'idle': {
        if (this.tool() === 'select' && !this.placing()) {
          const single = this.singleSelectedShape();
          const handle = single ? wbHandleAt(single, w.x, w.y, vp.zoom) : null;
          let connEnd: 'p1' | 'p2' | null = null;
          if (!handle && this.selection.size === 1) {
            const sel = this.doc.items.find((i) => i.id === [...this.selection][0]);
            if (sel && sel.kind === 'connector') {
              connEnd = wbConnectorHandleAt(this.doc, sel, w.x, w.y, vp.zoom);
            }
          }
          const hit = wbHitTest(this.doc, w.x, w.y, 6 / vp.zoom);
          const id = hit?.id ?? null;
          if (id !== this.hoverId) {
            this.hoverId = id;
            this.scheduleRender();
          }
          this.canvasEl.style.cursor = handle
            ? (WB_HANDLE_CURSORS[handle] ?? 'default')
            : connEnd
              ? 'grab'
              : id
                ? 'move'
                : 'default';
        } else {
          this.updateCursor();
        }
        return;
      }
    }
  };

  private applyResize(w: { x: number; y: number }): void {
    const o = this.resizeOriginal;
    const target = this.singleSelectedShape();
    if (!o || !target) return;
    let x = o.x;
    let y = o.y;
    let width = o.w;
    let height = o.h;
    const h = this.resizeHandle;
    if (h.includes('e')) width = w.x - o.x;
    if (h.includes('w')) {
      width = o.x + o.w - w.x;
      x = w.x;
    }
    if (h.includes('s')) height = w.y - o.y;
    if (h.includes('n')) {
      height = o.y + o.h - w.y;
      y = w.y;
    }
    const min = 24;
    if (width < min) {
      if (h.includes('w')) x = x + width - min;
      width = min;
    }
    if (height < min) {
      if (h.includes('n')) y = y + height - min;
      height = min;
    }
    target.x = x;
    target.y = y;
    target.w = width;
    target.h = height;
    this.moved = true;
    this.scheduleRender();
  }

  private snapSelection(): void {
    for (const id of this.selection) {
      const item = this.doc.items.find((i) => i.id === id);
      if (item && item.kind !== 'freehand' && item.kind !== 'connector') {
        item.x = Math.round(item.x / 8) * 8;
        item.y = Math.round(item.y / 8) * 8;
      }
    }
  }
  private readonly onPointerUp = (e: PointerEvent): void => {
    const canvas = this.canvasEl;
    if (canvas && canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    const w = this.toWorld(e);
    const vp = this.doc.viewport;

    switch (this.mode) {
      case 'pan':
        this.updateCursor();
        break;
      case 'move':
        if (this.moved) {
          this.snapSelection();
          this.commit('move');
        }
        break;
      case 'resize':
        if (this.moved) this.commit('resize');
        break;
      case 'draw':
        if (this.currentStroke.length >= 4) {
          this.doc.items.push({
            id: wbNewId(),
            kind: 'freehand',
            points: this.currentStroke,
            color: this.activeColor(),
            width: this.strokeWidth(),
          });
          this.commit('draw');
        }
        this.currentStroke = [];
        break;
      case 'connect':
        this.finishConnector(w, vp);
        break;
      case 'endpoint': {
        const d = this.endpointDrag;
        if (d && this.moved) {
          const c = this.doc.items.find((i) => i.id === d.id);
          if (c && c.kind === 'connector') {
            if (d.end === 'p1') c.from = d.target;
            else c.to = d.target;
            this.commit('endpoint');
          }
        }
        break;
      }
      case 'rubber': {
        if (this.moved && this.rubber) {
          const x = Math.min(this.rubber.x1, this.rubber.x2);
          const y = Math.min(this.rubber.y1, this.rubber.y2);
          const rw = Math.abs(this.rubber.x2 - this.rubber.x1);
          const rh = Math.abs(this.rubber.y2 - this.rubber.y1);
          const inside = this.doc.items.filter((i) => this.itemInRect(i, x, y, rw, rh));
          if (inside.length) {
            this.selection = new Set(inside.map((i) => i.id));
            this.syncSelection();
          }
        }
        break;
      }
      case 'erase':
        if (this.erasedAny) this.commit('erase');
        break;
      case 'idle':
        break;
    }

    this.mode = 'idle';
    this.pendingConnector = null;
    this.connectTarget = null;
    this.connectorPreview = null;
    this.resizeOriginal = null;
    this.resizeHandle = '';
    this.rubber = null;
    this.endpointDrag = null;
    this.highlightId = null;
    this.scheduleRender();
  };

  private itemInRect(item: WBItem, x: number, y: number, w: number, h: number): boolean {
    if (item.kind === 'connector') return false;
    if (item.kind === 'freehand') {
      const p = item.points;
      if (!p.length) return false;
      let minX = p[0];
      let minY = p[1];
      let maxX = p[0];
      let maxY = p[1];
      for (let i = 2; i < p.length; i += 2) {
        minX = Math.min(minX, p[i]);
        minY = Math.min(minY, p[i + 1]);
        maxX = Math.max(maxX, p[i]);
        maxY = Math.max(maxY, p[i + 1]);
      }
      return minX >= x && minY >= y && maxX <= x + w && maxY <= y + h;
    }
    return item.x >= x && item.y >= y && item.x + item.w <= x + w && item.y + item.h <= y + h;
  }

  private finishConnector(w: { x: number; y: number }, vp: WBViewport): void {
    const start = this.pendingConnector;
    if (!start) return;
    const fromId = start.fromId;
    const toId = this.connectTarget;
    const dist = Math.hypot(w.x - start.x, w.y - start.y);
    if (fromId && toId && fromId === toId) return;
    if (!fromId && !toId && dist < 10 / vp.zoom) return;
    const startPt = this.endCoords(fromId, { x: w.x, y: w.y }) ?? { x: start.x, y: start.y };
    const endPt = this.endCoords(toId, { x: start.x, y: start.y }) ?? { x: w.x, y: w.y };
    const conn: WBConnector = {
      id: wbNewId(),
      kind: 'connector',
      from: fromId,
      to: toId,
      x1: startPt.x,
      y1: startPt.y,
      x2: endPt.x,
      y2: endPt.y,
      label: '',
      color: this.activeColor(),
      dashed: false,
      bidirectional: false,
    };
    this.doc.items.push(conn);
    // Keep the new arrow selected so its end handles & toolbar are visible for editing.
    this.selection = new Set([conn.id]);
    this.syncSelection();
    this.commit('connect');
    this.inZone(() => this.tool.set('select'));
    this.updateCursor();
    this.hoverId = null;
  }
  // ===== Double-click, wheel & keyboard =====

  private readonly onDblClick = (e: MouseEvent): void => {
    if (!this.canvasEl) return;
    const w = this.toWorld(e);
    const hit = wbHitTest(this.doc, w.x, w.y, 6 / this.doc.viewport.zoom);
    if (!hit) {
      const item = wbShape('text', w.x, w.y, 180, 36, '', {
        fontSize: 16,
        stroke: this.activeColor(),
        fill: 'transparent',
      });
      this.doc.items.push(item);
      this.selection = new Set([item.id]);
      this.syncSelection();
      this.openEditor(item.id, false);
      this.scheduleRender();
      return;
    }
    if (hit.kind === 'connector') this.openEditor(hit.id, true);
    else if (hit.kind !== 'freehand') this.openEditor(hit.id, false);
  };

  private readonly onWheel = (e: WheelEvent): void => {
    if (!this.canvasEl) return;
    e.preventDefault();
    const rect = this.canvasEl.getBoundingClientRect();
    this.setZoom(this.doc.viewport.zoom * Math.exp(-e.deltaY * 0.0015), {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable)) return;
    if (this.editing()) return;

    const mod = e.ctrlKey || e.metaKey;

    if (e.code === 'Space') {
      if (!this.spaceDown) {
        this.spaceDown = true;
        if (this.canvasEl && this.mode === 'idle') this.canvasEl.style.cursor = 'grab';
        e.preventDefault();
      }
      return;
    }

    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) this.redo();
      else this.undo();
      return;
    }
    if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      this.redo();
      return;
    }
    if (mod && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      this.duplicateSelection();
      return;
    }
    if (mod && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      this.selection = new Set(this.doc.items.filter((i) => i.kind !== 'connector').map((i) => i.id));
      this.syncSelection();
      this.scheduleRender();
      return;
    }

    if (!mod) {
      const tools: Record<string, WBTool> = {
        v: 'select',
        p: 'pen',
        c: 'connector',
        t: 'text',
        e: 'eraser',
        h: 'pan',
      };
      const tool = tools[e.key.toLowerCase()];
      if (tool) {
        this.setTool(tool);
        return;
      }
      if (e.key.toLowerCase() === 'b') {
        this.toggleBidirectional();
        return;
      }
      if (e.key.toLowerCase() === 'f') {
        this.toggleFullscreen();
        return;
      }
    }

    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        this.deleteSelection();
        break;
      case 'Escape':
        if (this.fullscreen()) {
          this.toggleFullscreen();
          break;
        }
        if (this.placing()) {
          this.inZone(() => this.placing.set(null));
          this.updateCursor();
        } else {
          this.selection = new Set();
          this.syncSelection();
          if (this.tool() !== 'select') {
            this.inZone(() => this.tool.set('select'));
            this.updateCursor();
          }
          this.scheduleRender();
        }
        break;
      case '+':
      case '=':
        this.zoomIn();
        break;
      case '-':
        this.zoomOut();
        break;
      case '0':
        this.setZoom(1);
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        e.preventDefault();
        this.nudge(e.key, e.shiftKey ? 10 : 2);
        break;
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      this.spaceDown = false;
      if (this.canvasEl && this.mode === 'idle' && this.tool() !== 'pan') {
        this.canvasEl.style.cursor = 'default';
      }
    }
  };

  private nudge(key: string, step: number): void {
    if (!this.selection.size) return;
    const dx = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0;
    const dy = key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0;
    for (const id of this.selection) {
      const item = this.doc.items.find((i) => i.id === id);
      if (item) this.translateItem(item, dx, dy);
    }
    this.commit('nudge', 'nudge');
    this.scheduleRender();
  }
  // ===== Inline text editor =====

  private openEditor(id: string, isLabel: boolean): void {
    const item = this.doc.items.find((i) => i.id === id);
    if (!item || item.kind === 'freehand') return;
    const value = item.kind === 'connector' ? item.label : item.text;
    this.inZone(() => {
      this.editing.set({ id, isLabel });
      this.scheduleRender();
      setTimeout(() => {
        const el = this.editorRef()?.nativeElement;
        if (el) {
          el.value = value;
          el.focus();
          el.select();
        }
      }, 10);
    });
  }

  private closeEditor(save: boolean): void {
    const ed = this.editing();
    if (!ed) return;
    const el = this.editorRef()?.nativeElement;
    const value = (el ? el.value : '').trim();
    const item = this.doc.items.find((i) => i.id === ed.id);
    if (item && save) {
      if (item.kind === 'connector') {
        item.label = value;
        this.commit('label');
      } else if (item.kind !== 'freehand') {
        if (item.text !== value) {
          item.text = value;
          this.commit('text');
        }
        if (item.kind === 'text' && !value) {
          this.doc.items = this.doc.items.filter((i) => i.id !== item.id);
          this.selection.delete(item.id);
          this.syncSelection();
          this.inZone(() => this.itemCount.set(this.doc.items.length));
        }
      }
    }
    this.inZone(() => this.editing.set(null));
    this.scheduleRender();
  }

  onEditorKey(e: KeyboardEvent): void {
    e.stopPropagation();
    const ed = this.editing();
    const singleLine = !!ed && (ed.isLabel || this.isTextItem(ed.id));
    if (e.key === 'Escape') {
      e.preventDefault();
      this.closeEditor(false);
      return;
    }
    if (e.key === 'Enter' && (singleLine || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.closeEditor(true);
    }
  }

  onEditorBlur(): void {
    this.closeEditor(true);
  }

  private isTextItem(id: string): boolean {
    const item = this.doc.items.find((i) => i.id === id);
    return !!item && item.kind === 'text';
  }
  // ===== History & persistence =====

  private commit(label: string, coalesceKey?: string, silent = false): void {
    const json = JSON.stringify(this.doc);
    const now = Date.now();
    if (coalesceKey && this.lastCommit.label === coalesceKey && now - this.lastCommit.time < 900) {
      this.history[this.historyIndex] = json;
    } else {
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push(json);
      if (this.history.length > 60) this.history.shift();
      this.historyIndex = this.history.length - 1;
    }
    this.lastCommit = { label: coalesceKey ?? label, time: now };
    if (!silent) {
      this.inZone(() => {
        this.canUndo.set(this.historyIndex > 0);
        this.canRedo.set(this.historyIndex < this.history.length - 1);
        this.saved.set(false);
        this.itemCount.set(this.doc.items.length);
      });
      this.scheduleAutosave();
    }
  }

  undo(): void {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.restoreHistory();
  }

  redo(): void {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.restoreHistory();
  }

  private restoreHistory(): void {
    const json = this.history[this.historyIndex];
    if (!json) return;
    this.doc = JSON.parse(json) as WBDocument;
    const valid = new Set(this.doc.items.map((i) => i.id));
    this.selection = new Set([...this.selection].filter((id) => valid.has(id)));
    this.syncSelection();
    this.inZone(() => {
      this.zoom.set(Math.round(this.doc.viewport.zoom * 100));
      this.canUndo.set(this.historyIndex > 0);
      this.canRedo.set(this.historyIndex < this.history.length - 1);
      this.saved.set(false);
      this.itemCount.set(this.doc.items.length);
    });
    this.scheduleAutosave();
    this.scheduleRender();
  }

  private scheduleAutosave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      try {
        localStorage.setItem(WB_STORAGE_PREFIX + this.storageKey(), JSON.stringify(this.doc));
        this.inZone(() => this.saved.set(true));
      } catch {
        /* storage unavailable */
      }
    }, 700);
  }

  // ===== Selection actions =====

  deleteSelection(): void {
    if (!this.selection.size) return;
    const ids = new Set(this.selection);
    this.doc.items = this.doc.items.filter((i) => !ids.has(i.id));
    this.pruneDanglingConnectors();
    this.selection = new Set();
    this.syncSelection();
    this.commit('delete');
    this.scheduleRender();
  }

  duplicateSelection(): void {
    if (!this.selection.size) return;
    const idMap = new Map<string, string>();
    const clones: WBItem[] = [];
    for (const id of this.selection) {
      const item = this.doc.items.find((i) => i.id === id);
      if (!item || item.kind === 'connector') continue;
      const copy = JSON.parse(JSON.stringify(item)) as WBItem;
      copy.id = wbNewId();
      idMap.set(item.id, copy.id);
      if (copy.kind === 'freehand') {
        for (let i = 0; i < copy.points.length; i += 2) {
          copy.points[i] += 24;
          copy.points[i + 1] += 24;
        }
      } else if (copy.kind !== 'connector') {
        copy.x += 24;
        copy.y += 24;
      }
      clones.push(copy);
    }
    for (const id of this.selection) {
      const item = this.doc.items.find((i) => i.id === id);
      if (!item || item.kind !== 'connector') continue;
      const from = item.from ? idMap.get(item.from) : undefined;
      const to = item.to ? idMap.get(item.to) : undefined;
      if (!from || !to) continue;
      const copy = JSON.parse(JSON.stringify(item)) as WBItem;
      copy.id = wbNewId();
      if (copy.kind === 'connector') {
        copy.from = from;
        copy.to = to;
      }
      clones.push(copy);
    }
    if (!clones.length) return;
    this.doc.items.push(...clones);
    this.selection = new Set(clones.map((c) => c.id));
    this.syncSelection();
    this.commit('duplicate');
    this.scheduleRender();
  }
  // ===== Arrow (connector) editing =====

  private selectedConnector(): WBConnector | null {
    const id = this.ctxConn()?.id;
    if (!id) return null;
    const item = this.doc.items.find((i) => i.id === id);
    return item && item.kind === 'connector' ? item : null;
  }

  /** Toggle one-way ⇄ two-way arrowheads on the selected arrow (B). */
  toggleBidirectional(): void {
    const c = this.selectedConnector();
    if (!c) return;
    c.bidirectional = !c.bidirectional;
    this.syncCtxConn();
    this.commit('arrow-direction');
    this.scheduleRender();
  }

  /** Toggle dashed/solid stroke on the selected arrow. */
  toggleConnectorDashed(): void {
    const c = this.selectedConnector();
    if (!c) return;
    c.dashed = !c.dashed;
    this.syncCtxConn();
    this.commit('arrow-style');
    this.scheduleRender();
  }

  /** Open the inline label editor for the selected arrow. */
  editConnectorLabel(): void {
    const c = this.selectedConnector();
    if (c) this.openEditor(c.id, true);
  }
  // ===== Fullscreen =====

  /**
   * Expands the board over the whole page with CSS (`position: fixed` overlay)
   * instead of the Fullscreen API — works everywhere, including iframes and
   * embedded previews, and keeps canvas interactions (pointer capture, wheel
   * zoom) completely normal while expanded.
   */
  toggleFullscreen(): void {
    const next = !this.fullscreen();
    const host = this.hostRef.nativeElement as HTMLElement;
    host.classList.toggle('is-fullscreen', next);
    this.inZone(() => this.fullscreen.set(next));
    this.onResize();
  }

  // ===== Viewport & toolbar actions =====

  setTool(t: WBTool): void {
    this.inZone(() => {
      this.tool.set(t);
      this.placing.set(null);
    });
    this.updateCursor();
  }

  armStencil(st: WBStencil): void {
    this.inZone(() => {
      this.placing.set(st);
      this.editing.set(null);
    });
    this.updateCursor();
  }

  setColor(c: string): void {
    this.inZone(() => this.activeColor.set(c));
  }

  setWidth(w: number): void {
    this.inZone(() => this.strokeWidth.set(w));
  }

  toggleHelp(): void {
    this.inZone(() => this.helpOpen.update((v) => !v));
  }

  toolIs(t: WBTool): boolean {
    return this.tool() === t && !this.placing();
  }

  stencilsFor(group: WBStencil['group']): WBStencil[] {
    return WB_STENCILS.filter((s) => s.group === group);
  }

  zoomIn(): void {
    this.setZoom(this.doc.viewport.zoom * 1.2);
  }

  zoomOut(): void {
    this.setZoom(this.doc.viewport.zoom / 1.2);
  }

  private setZoom(z: number, anchor?: { x: number; y: number }): void {
    const vp = this.doc.viewport;
    const nz = Math.min(4, Math.max(0.2, z));
    const rect = this.canvasEl?.getBoundingClientRect();
    const cx = anchor?.x ?? (rect ? rect.width / 2 : this.viewW / 2);
    const cy = anchor?.y ?? (rect ? rect.height / 2 : this.viewH / 2);
    const wx = (cx - vp.panX) / vp.zoom;
    const wy = (cy - vp.panY) / vp.zoom;
    vp.zoom = nz;
    vp.panX = cx - wx * nz;
    vp.panY = cy - wy * nz;
    this.inZone(() => this.zoom.set(Math.round(nz * 100)));
    this.scheduleRender();
    this.scheduleAutosave();
  }

  fitView(): void {
    const rect = this.canvasEl?.getBoundingClientRect();
    const bbox = wbBBox(this.doc, this.doc.items);
    if (!rect || !bbox) return;
    const pad = 60;
    const zoom = Math.min(2, Math.max(0.2, Math.min((rect.width - pad * 2) / bbox.w, (rect.height - pad * 2) / bbox.h)));
    const vp = this.doc.viewport;
    vp.zoom = zoom;
    vp.panX = rect.width / 2 - (bbox.x + bbox.w / 2) * zoom;
    vp.panY = rect.height / 2 - (bbox.y + bbox.h / 2) * zoom;
    this.inZone(() => this.zoom.set(Math.round(zoom * 100)));
    this.scheduleRender();
    this.scheduleAutosave();
  }

  resetView(): void {
    const rect = this.canvasEl?.getBoundingClientRect();
    const bbox = wbBBox(this.doc, this.doc.items);
    const vp = this.doc.viewport;
    vp.zoom = 1;
    if (rect && bbox) {
      vp.panX = rect.width / 2 - (bbox.x + bbox.w / 2);
      vp.panY = rect.height / 2 - (bbox.y + bbox.h / 2);
    } else if (rect) {
      vp.panX = rect.width / 2 - 400;
      vp.panY = rect.height / 2 - 300;
    } else {
      vp.panX = 0;
      vp.panY = 0;
    }
    this.inZone(() => this.zoom.set(100));
    this.scheduleRender();
    this.scheduleAutosave();
  }

  exportPng(): void {
    const bbox = wbBBox(this.doc, this.doc.items);
    const pad = 32;
    const scale = 2;
    const width = Math.min(8000, Math.ceil(((bbox?.w ?? 800) + pad * 2) * scale));
    const height = Math.min(8000, Math.ceil(((bbox?.h ?? 500) + pad * 2) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const vp = {
      zoom: scale,
      panX: pad * scale - (bbox?.x ?? 0) * scale,
      panY: pad * scale - (bbox?.y ?? 0) * scale,
    };
    const temp: WBDocument = { ...this.doc, viewport: vp };
    new WhiteboardRenderer(ctx).render(
      temp,
      {
        selection: new Set<string>(),
        hoverId: null,
        rubber: null,
        connectorPreview: null,
        highlightShapeId: null,
        hiddenTextId: null,
        showGrid: false,
        bg: '#ffffff',
      },
      { width, height, dpr: 1 },
    );
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whiteboard-${this.storageKey()}-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }

  clearBoard(): void {
    if (!this.doc.items.length) return;
    if (!window.confirm('Clear the whole whiteboard? (Ctrl+Z will restore it)')) return;
    this.doc.items = [];
    this.selection = new Set();
    this.syncSelection();
    this.commit('clear');
    this.resetView();
  }
}








