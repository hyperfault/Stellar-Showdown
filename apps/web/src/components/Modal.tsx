import { useEffect, useRef, type KeyboardEvent as ReactKeyEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useGamepadNav } from './useGamepadNav';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Rendered in the header between the title and the close button (e.g. a search field). */
  headerExtra?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
  /** Extra class on the dialog (for screen-specific layout). */
  className?: string;
  /** Key handler for the whole dialog, header included (so a search field in the header can drive a list in the body). */
  onKeyDown?: (e: ReactKeyEvent<HTMLDivElement>) => void;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Stellar dialog: portal + backdrop, Escape / outside-click close, focus trap and restore, controller input. */
export function Modal({ open, onClose, title, headerExtra, children, footer, size = 'lg', className = '', onKeyDown }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useGamepadNav(open);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current!;
    (el.querySelector<HTMLElement>('[data-autofocus]') ?? el.querySelector<HTMLElement>(FOCUSABLE))?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const nodes = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!nodes.length) return;
      const first = nodes[0]!, last = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      prev?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal__dialog modal__dialog--${size} ${className}`} role="dialog" aria-modal="true" aria-label={title} ref={ref} onKeyDown={onKeyDown}>
        <header className="modal__head">
          <h2 className="modal__title">{title}</h2>
          {headerExtra}
          <button className="icon-btn modal__close" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
