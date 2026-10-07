import { useEffect } from 'react';

const REPEAT_MS = 160;

function press(key: string): void {
  const el = (document.activeElement as HTMLElement | null) ?? document.body;
  if (key === 'Enter' && el.matches('button, a[href], [role="option"], [role="menuitem"], [role="tab"]')) {
    el.click();
    return;
  }
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

/**
 * Maps a standard-layout gamepad onto the keyboard handling the UI already has:
 * D-pad / left stick = arrows, A = Enter (click on buttons), B = Escape, LB/RB = PageUp/PageDown,
 * X = "/" (focus search). While `active` is false nothing is polled.
 */
export function useGamepadNav(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const last = new Map<string, number>();
    let raf = 0;
    const fire = (id: string, down: boolean, key: string, now: number, repeat: boolean) => {
      if (!down) { last.delete(id); return; }
      const t = last.get(id);
      if (t === undefined || (repeat && now - t > REPEAT_MS)) { last.set(id, t === undefined ? now + 220 - REPEAT_MS : now); press(key); }
    };
    const tick = (now: number) => {
      for (const pad of navigator.getGamepads()) {
        if (!pad) continue;
        const b = (i: number) => !!pad.buttons[i]?.pressed;
        const ax = pad.axes[0] ?? 0, ay = pad.axes[1] ?? 0;
        const k = pad.index;
        fire(`${k}u`, b(12) || ay < -0.6, 'ArrowUp', now, true);
        fire(`${k}d`, b(13) || ay > 0.6, 'ArrowDown', now, true);
        fire(`${k}l`, b(14) || ax < -0.6, 'ArrowLeft', now, true);
        fire(`${k}r`, b(15) || ax > 0.6, 'ArrowRight', now, true);
        fire(`${k}a`, b(0), 'Enter', now, false);
        fire(`${k}b`, b(1), 'Escape', now, false);
        fire(`${k}x`, b(2), '/', now, false);
        fire(`${k}lb`, b(4), 'PageUp', now, false);
        fire(`${k}rb`, b(5), 'PageDown', now, false);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}
