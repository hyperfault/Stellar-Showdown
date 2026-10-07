import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Generation } from '@stellar/core';
import { Modal } from '../components/Modal';
import { Icon } from '../components/Icon';
import { listSpecies } from '../data/dex';
import { PokeIcon } from './PokeIcon';
import { TypeBadge } from './TypeBadge';
import { typeColor } from '../typeColors';

interface Props {
  open: boolean;
  onClose: () => void;
  gen: Generation;
  onPick: (speciesName: string) => void;
  current?: string;
}

const GENS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Full-screen species browser: icon grid, fast search, generation + type filters, keyboard / touch / controller navigation. */
export function PokemonPicker({ open, onClose, gen, onPick, current }: Props) {
  const all = useMemo(() => listSpecies(gen), [gen]);
  const [query, setQuery] = useState('');
  const [genFilter, setGenFilter] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) { setQuery(''); setGenFilter(null); setTypeFilter(null); setActive(0); } }, [open]);

  const types = useMemo(() => [...gen.types].map((t) => t.name).filter((n) => n !== '???'), [gen]);
  const q = query.trim().toLowerCase().replace(/^#/, '');
  const list = useMemo(() => all.filter((s) => {
    if (genFilter && s.gen !== genFilter) return false;
    if (typeFilter && !s.types.includes(typeFilter as never)) return false;
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.id.includes(q.replace(/[^a-z0-9]/g, '')) || String(s.num) === q
      || s.types.some((t) => t.toLowerCase() === q);
  }), [all, genFilter, typeFilter, q]);

  useEffect(() => setActive(0), [q, genFilter, typeFilter]);
  useEffect(() => {
    grid.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const cols = () => (grid.current ? getComputedStyle(grid.current).gridTemplateColumns.split(' ').length : 1);
  const cycleGen = (d: number) => {
    const order: (number | null)[] = [null, ...GENS.filter((g) => g <= gen.num)];
    setGenFilter(order[(order.indexOf(genFilter) + d + order.length) % order.length] ?? null);
  };
  const choose = (i: number) => { const s = list[i]; if (s) { onPick(s.name); onClose(); } };

  const onKey = (e: KeyboardEvent) => {
    const last = list.length - 1;
    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); setActive((i) => Math.min(last, i + 1)); break;
      case 'ArrowLeft': e.preventDefault(); setActive((i) => Math.max(0, i - 1)); break;
      case 'ArrowDown': e.preventDefault(); setActive((i) => Math.min(last, i + cols())); break;
      case 'ArrowUp': e.preventDefault(); setActive((i) => Math.max(0, i - cols())); break;
      case 'PageDown': e.preventDefault(); cycleGen(1); break;
      case 'PageUp': e.preventDefault(); cycleGen(-1); break;
      case 'Enter': e.preventDefault(); choose(active); break;
    }
  };

  const search = (
    <label className="fp__search">
      <Icon name="search" size={16} />
      <input data-autofocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, #, or type"
        aria-label="Search Pokémon" autoComplete="off" spellCheck={false} />
    </label>
  );

  return (
    <Modal open={open} onClose={onClose} size="xl" title="Choose Pokémon" headerExtra={search} className="pp" onKeyDown={onKey}
      footer={<span className="fp__hints"><kbd>←↑↓→</kbd> move <kbd>Enter</kbd> pick <kbd>PgUp/PgDn</kbd> generation <kbd>Esc</kbd> close · {list.length} Pokémon</span>}>
      <div className="pp__body">
        <div className="pp__filters">
          <div className="pp__chips" role="group" aria-label="Generation">
            <button className={`fchip fchip--btn${genFilter === null ? ' is-on' : ''}`} onClick={() => setGenFilter(null)}>All</button>
            {GENS.filter((g) => g <= gen.num).map((g) => (
              <button key={g} className={`fchip fchip--btn${genFilter === g ? ' is-on' : ''}`} onClick={() => setGenFilter(genFilter === g ? null : g)}>Gen {g}</button>
            ))}
          </div>
          <div className="pp__chips" role="group" aria-label="Type">
            {types.map((t) => (
              <button key={t} className={`pp__type${typeFilter === t ? ' is-on' : ''}`} style={{ ['--tc' as string]: typeColor(t) }}
                aria-pressed={typeFilter === t} aria-label={t} title={t} onClick={() => setTypeFilter(typeFilter === t ? null : t)}>
                {t.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
        <div className="pp__grid" role="listbox" aria-label="Pokémon" ref={grid}>
          {list.length === 0 && <div className="empty">No Pokémon match.</div>}
          {list.map((s, i) => (
            <button key={s.id} data-i={i} role="option" tabIndex={-1} aria-selected={s.name === current}
              className={`pp__tile${i === active ? ' is-active' : ''}${s.name === current ? ' is-current' : ''}`}
              onMouseMove={() => i !== active && setActive(i)} onClick={() => choose(i)}>
              <PokeIcon species={s.name} scale={1.5} />
              <span className="pp__name">{s.name}</span>
              <span className="pp__types">{s.types.map((t) => <TypeBadge key={t} type={t} small />)}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
