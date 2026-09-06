import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Whiteboard } from './whiteboard';

/**
 * Interaction smoke tests. The canvas registers pointer/wheel listeners outside
 * the Angular zone, so these exercise the real event flow end-to-end in a
 * headless Chrome: boot, shape dragging, wheel zoom and the fullscreen toggle.
 */
describe('Whiteboard', () => {
  let fixture: ComponentFixture<Whiteboard>;
  let component: Whiteboard;
  let canvas: HTMLCanvasElement;

  const tick = () => new Promise((r) => setTimeout(r, 0));

  beforeAll(() => {
    // Synthetic (untrusted) pointer events cannot be captured — stub capture out.
    spyOn(HTMLCanvasElement.prototype, 'setPointerCapture').and.stub();
    spyOn(HTMLCanvasElement.prototype, 'releasePointerCapture').and.stub();
  });

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [Whiteboard] }).compileComponents();
    fixture = TestBed.createComponent(Whiteboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    // Wait for afterNextRender() bootstrap + first ResizeObserver tick.
    for (let i = 0; i < 100 && !(component as any).canvasEl?.style.width; i++) {
      await tick();
    }
    canvas = (component as any).canvasEl as HTMLCanvasElement;
  });

  afterEach(() => localStorage.clear());

  function screenPoint(worldX: number, worldY: number): { x: number; y: number } {
    const vp = (component as any).doc.viewport;
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + worldX * vp.zoom + vp.panX, y: rect.top + worldY * vp.zoom + vp.panY };
  }

  function pointerEvent(type: string, x: number, y: number): PointerEvent {
    return new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      isPrimary: true,
      clientX: x,
      clientY: y,
    });
  }

  it('boots the canvas with the starter document', () => {
    expect(canvas).toBeTruthy();
    expect(canvas.width).toBeGreaterThan(1);
    expect((component as any).doc.items.length).toBeGreaterThan(0);
  });

  it('drags a shape with pointer events', () => {
    const note = (component as any).doc.items[0]; // starter note at (40, 40)
    const before = { x: note.x, y: note.y };
    const p = screenPoint(note.x + note.w / 2, note.y + note.h / 2);

    canvas.dispatchEvent(pointerEvent('pointerdown', p.x, p.y));
    window.dispatchEvent(pointerEvent('pointermove', p.x + 48, p.y + 32));
    window.dispatchEvent(pointerEvent('pointerup', p.x + 48, p.y + 32));

    // Dragged 48/32 world units, snapped to the 8px grid on release.
    expect(note.x).toBe(Math.round((before.x + 48) / 8) * 8);
    expect(note.y).toBe(Math.round((before.y + 32) / 8) * 8);
    expect((component as any).mode).toBe('idle');
  });

  it('zooms the internal view with the mouse wheel', () => {
    const before = component.zoom();
    const vp = (component as any).doc.viewport;
    const rect = canvas.getBoundingClientRect();
    canvas.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: -240,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      }),
    );
    expect(component.zoom()).toBeGreaterThan(before);
    expect(vp.zoom).toBeGreaterThan(1);
  });

  it('toggles fullscreen via the host class', () => {
    const host = fixture.nativeElement as HTMLElement;
    component.toggleFullscreen();
    expect(component.fullscreen()).toBeTrue();
    expect(host.classList.contains('is-fullscreen')).toBeTrue();
    component.toggleFullscreen();
    expect(component.fullscreen()).toBeFalse();
    expect(host.classList.contains('is-fullscreen')).toBeFalse();
  });
});