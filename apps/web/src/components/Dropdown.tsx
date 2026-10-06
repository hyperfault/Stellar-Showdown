import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export interface TriggerProps { 'data-trigger': true; 'aria-haspopup': 'menu'; 'aria-expanded': boolean; onClick: () => void; }

interface Props {
  renderTrigger: (props: TriggerProps, open: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
}

const ITEMS = '[role="menuitem"],[role="option"]';

/** Accessible popover: closes on outside press/Escape, arrow-key navigation, returns focus to trigger. */
export function Dropdown({ renderTrigger, children, align = 'left' }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const el = root.current!;
    el.querySelector<HTMLElement>(ITEMS)?.focus({ preventScroll: true });
    const onDown = (e: Event) => { if (!el.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); el.querySelector<HTMLElement>('[data-trigger]')?.focus(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...el.querySelectorAll<HTMLElement>(ITEMS)];
        const i = items.indexOf(document.activeElement as HTMLElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[next]?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, close]);

  return (
    <div className="dd" ref={root}>
      {renderTrigger({ 'data-trigger': true, 'aria-haspopup': 'menu', 'aria-expanded': open, onClick: () => setOpen((o) => !o) }, open)}
      {open && <div className={`dd__panel dd__panel--${align}`} role="menu">{children(close)}</div>}
    </div>
  );
}
