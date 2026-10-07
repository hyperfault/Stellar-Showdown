import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { useGamepadNav } from '../components/useGamepadNav';

export interface Option {
  id: string;
  label: string;
  /** Leading visual (icon, type badge, ...). */
  lead?: ReactNode;
  /** Short secondary text on the right. */
  meta?: ReactNode;
  /** One-line description under the label. */
  hint?: string;
  group?: string;
  /** Extra text matched by search. */
  keywords?: string;
}

interface Props {
  label: string;
  value: string;
  options: Option[];
  onChange: (id: string) => void;
  placeholder?: string;
  /** Show a "none" entry that clears the value. */
  clearable?: boolean;
  disabled?: boolean;
  /** Visual shown inside the trigger for the current value. */
  lead?: ReactNode;
  className?: string;
}

const LIMIT = 80;

/** Searchable single-select: replaces <select> for items, abilities, moves, natures, types. Keyboard, touch and controller friendly. */
export function Selector({ label, value, options, onChange, placeholder = 'Choose…', clearable, disabled, lead, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const uid = useId();
  useGamepadNav(open);

  const current = options.find((o) => o.id === value);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!open) return [];
    const list = q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.keywords?.toLowerCase().includes(q) || o.id.includes(q.replace(/\s+/g, ''))) : options;
    // Prefix matches first, keeping the incoming (already meaningful) order otherwise.
    if (q) list.sort((a, b) => Number(b.label.toLowerCase().startsWith(q)) - Number(a.label.toLowerCase().startsWith(q)));
    return list.slice(0, LIMIT);
  }, [open, options, q]);
  const total = q ? options.filter((o) => o.label.toLowerCase().includes(q)).length : options.length;

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(Math.max(0, options.findIndex((o) => o.id === value)));
    input.current?.focus({ preventScroll: true });
    const out = (e: Event) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', out);
    return () => document.removeEventListener('pointerdown', out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    if (open) root.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const close = (refocus = true) => { setOpen(false); if (refocus) trigger.current?.focus(); };
  const pick = (o?: Option) => { if (o) { onChange(o.id); close(); } };

  const onKey = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive((i) => Math.min(filtered.length - 1, i + 1)); break;
      case 'ArrowUp': e.preventDefault(); setActive((i) => Math.max(0, i - 1)); break;
      case 'PageDown': e.preventDefault(); setActive((i) => Math.min(filtered.length - 1, i + 6)); break;
      case 'PageUp': e.preventDefault(); setActive((i) => Math.max(0, i - 6)); break;
      case 'Enter': e.preventDefault(); pick(filtered[active]); break;
      case 'Escape': e.preventDefault(); e.stopPropagation(); close(); break;
      case 'Tab': setOpen(false); break;
    }
  };

  return (
    <div className={`sel ${className}`} ref={root}>
      <button ref={trigger} type="button" className="sel__btn" disabled={disabled} aria-haspopup="listbox" aria-expanded={open}
        aria-label={`${label}: ${current?.label ?? (value || 'none')}`} onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true); } }}>
        <span className="sel__label">{label}</span>
        <span className="sel__value">{lead}<span className={value ? '' : 'dim'}>{current?.label ?? (value || placeholder)}</span></span>
        <Icon name="chevron" size={14} className="chev" />
      </button>
      {open && (
        <div className="sel__pop" onKeyDown={onKey}>
          <label className="sel__search">
            <Icon name="search" size={14} />
            <input ref={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${label.toLowerCase()}`}
              role="combobox" aria-label={`Search ${label.toLowerCase()}`} aria-expanded="true" aria-controls={`${uid}-l`} aria-activedescendant={filtered[active] ? `${uid}-${active}` : undefined}
              autoComplete="off" spellCheck={false} />
          </label>
          <div className="sel__list" role="listbox" id={`${uid}-l`} aria-label={label}>
            {clearable && !q && (
              <button type="button" className="sel__opt sel__opt--clear" role="option" aria-selected={!value} onClick={() => { onChange(''); close(); }}>
                <span className="sel__name dim">None</span>
              </button>
            )}
            {filtered.length === 0 && <div className="empty">Nothing matches “{query}”.</div>}
            {filtered.map((o, i) => (
              <div key={o.id}>
                {o.group && (i === 0 || filtered[i - 1]!.group !== o.group) && <div className="sel__group">{o.group}</div>}
                <button type="button" id={`${uid}-${i}`} data-i={i} role="option" tabIndex={-1} aria-selected={o.id === value}
                  className={`sel__opt${i === active ? ' is-active' : ''}`} onMouseMove={() => setActive(i)} onClick={() => pick(o)}>
                  {o.lead}
                  <span className="sel__text"><span className="sel__name">{o.label}</span>{o.hint && <span className="sel__hint">{o.hint}</span>}</span>
                  {o.meta && <span className="sel__meta">{o.meta}</span>}
                  {o.id === value && <Icon name="check" size={14} className="sel__check" />}
                </button>
              </div>
            ))}
            {total > LIMIT && <div className="empty">Showing {LIMIT} of {total} — keep typing to narrow down.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
