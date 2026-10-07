import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { FormatEntry } from '@stellar/core';
import type { FormatRules } from '@stellar/core/validation';
import { Modal } from '../components/Modal';
import { Icon } from '../components/Icon';
import { useAppStore } from '../store';
import { useFormatSource } from './useFormatSource';
import { pickTeam, useTeamStore } from '../teams/store';
import { availability, formatSupport, type FormatSupport, type Purpose } from './support';
import { useAllFormatRules, useFormatRules } from './useFormatRules';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 'play': choosing a format to queue for. 'team': choosing the format a team is built for. */
  purpose: Purpose;
  value?: string;
  onSelect: (formatId: string) => void;
  onOpenTeams?: () => void;
}

interface Row { f: FormatEntry; support: FormatSupport; ok: boolean; why?: string; }

const ALL = '';

export function FormatPicker({ open, onClose, purpose, value, onSelect, onOpenTeams }: Props) {
  const { formats, offline } = useFormatSource(open);
  const connected = useAppStore((s) => s.connected);
  const rulesMap = useAllFormatRules(open ? formats.map((f) => f.id) : []);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);
  const [activeId, setActiveId] = useState<string | undefined>(value);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setQuery(''); setCategory(ALL); setActiveId(value); } }, [open, value]);

  const rows: Row[] = useMemo(() => formats
    .filter((f) => (purpose === 'team' ? f.needsTeam : true))
    .map((f) => {
      const support = formatSupport(f, rulesMap[f.id]);
      const a = offline && purpose === 'play' ? { enabled: false, reason: 'Connect to the server to queue for battles.' } : availability(f, support, purpose);
      return { f, support, ok: a.enabled, why: a.reason };
    }), [formats, rulesMap, purpose, offline]);

  const categories = useMemo(() => {
    const seen = new Map<string, number>();
    for (const r of rows) seen.set(r.f.section, (seen.get(r.f.section) ?? 0) + 1);
    return [...seen.entries()];
  }, [rows]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => rows.filter((r) => {
    if (q) return r.f.name.toLowerCase().includes(q) || r.f.id.includes(q.replace(/\s+/g, '')) || r.f.section.toLowerCase().includes(q);
    return category === ALL || r.f.section === category;
  }), [rows, q, category]);

  const activeIdx = Math.max(0, visible.findIndex((r) => r.f.id === activeId));
  const active = visible[activeIdx];

  useEffect(() => {
    if (active) listRef.current?.querySelector<HTMLElement>(`[data-id="${active.f.id}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active?.f.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = (d: number) => {
    if (!visible.length) return;
    const next = visible[(activeIdx + d + visible.length) % visible.length]!;
    setActiveId(next.f.id);
  };
  const shiftCategory = (d: number) => {
    const order = [ALL, ...categories.map(([c]) => c)];
    const i = order.indexOf(category);
    setCategory(order[(i + d + order.length) % order.length]!);
    setQuery('');
  };
  const choose = (r: Row | undefined) => { if (r?.ok) { onSelect(r.f.id); onClose(); } };

  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); move(1); break;
      case 'ArrowUp': e.preventDefault(); move(-1); break;
      case 'PageDown': e.preventDefault(); shiftCategory(1); break;
      case 'PageUp': e.preventDefault(); shiftCategory(-1); break;
      case 'ArrowRight': if (!query) { e.preventDefault(); shiftCategory(1); } break;
      case 'ArrowLeft': if (!query) { e.preventDefault(); shiftCategory(-1); } break;
      case 'Enter': e.preventDefault(); choose(active); break;
      case '/': if (document.activeElement !== searchRef.current) { e.preventDefault(); searchRef.current?.focus(); } break;
    }
  };

  const search = (
    <label className="fp__search">
      <Icon name="search" size={16} />
      <input
        ref={searchRef} data-autofocus value={query} onChange={(e) => setQuery(e.target.value)}
        placeholder="Search formats" aria-label="Search formats" role="combobox" aria-expanded="true" aria-controls="fp-list"
        aria-activedescendant={active ? `fp-opt-${active.f.id}` : undefined} autoComplete="off" spellCheck={false}
      />
    </label>
  );

  return (
    <Modal open={open} onClose={onClose} size="xl" className="fp" onKeyDown={onKeyDown}
      title={purpose === 'play' ? 'Select format' : 'Team format'} headerExtra={search}
      footer={<span className="fp__hints"><kbd>↑↓</kbd> move <kbd>←→</kbd> category <kbd>Enter</kbd> select <kbd>Esc</kbd> close{offline && rows.length > 0 && ' · Showing formats bundled with Stellar — connect for the live list'}</span>}>
      <div className="fp__body">
        <nav className="fp__cats" role="tablist" aria-label="Format categories" aria-orientation="vertical">
          <button role="tab" aria-selected={!q && category === ALL} className="fp__cat" onClick={() => { setCategory(ALL); setQuery(''); searchRef.current?.focus(); }}>
            All <span>{rows.length}</span>
          </button>
          {categories.map(([c, n]) => (
            <button key={c} role="tab" aria-selected={!q && category === c} className="fp__cat" onClick={() => { setCategory(c); setQuery(''); searchRef.current?.focus(); }}>
              <b>{c || 'Other'}</b> <span>{n}</span>
            </button>
          ))}
        </nav>

        <div className="fp__list" id="fp-list" role="listbox" aria-label="Formats" ref={listRef}>
          {rows.length === 0 && (
            <div className="empty">{connected ? 'The server has not sent a format list yet.' : 'Connecting to the server — formats arrive right after.'}</div>
          )}
          {rows.length > 0 && visible.length === 0 && <div className="empty">No formats match “{query}”.</div>}
          {visible.map((r, i) => {
            const showSection = (q || category === ALL) && (i === 0 || visible[i - 1]!.f.section !== r.f.section);
            return (
              <div key={r.f.id} className="fp__group">
                {showSection && <div className="fp__section">{r.f.section || 'Other'}</div>}
                <button
                  id={`fp-opt-${r.f.id}`} data-id={r.f.id} role="option" tabIndex={-1}
                  aria-selected={r.f.id === value} aria-disabled={!r.ok}
                  className={`fp__row${r.f.id === active?.f.id ? ' is-active' : ''}${r.ok ? '' : ' is-off'}`}
                  onMouseMove={() => r.f.id !== activeId && setActiveId(r.f.id)}
                  onClick={() => { setActiveId(r.f.id); choose(r); }}
                >
                  <span className="fp__name">{r.f.name}</span>
                  <span className="fp__tags"><Tags row={r} purpose={purpose} /></span>
                  {r.f.id === value && <Icon name="check" size={16} className="fp__check" />}
                  {!r.ok && r.why && <span className="fp__why">{r.why}</span>}
                </button>
              </div>
            );
          })}
        </div>

        <aside className="fp__detail" aria-live="polite">
          {active ? <Detail row={active} purpose={purpose} onOpenTeams={onOpenTeams} /> : <div className="empty">Select a format to see its rules.</div>}
        </aside>
      </div>
    </Modal>
  );
}

function Tags({ row, purpose }: { row: Row; purpose: Purpose }) {
  const { f, support } = row;
  return (
    <>
      {purpose === 'play' && f.isRandomFormat && <span className="fchip fchip--accent">Random</span>}
      {purpose === 'play' && !f.isRandomFormat && f.searchShow && <span className="fchip">Ladder</span>}
      {purpose === 'play' && !f.searchShow && f.challengeShow && <span className="fchip fchip--warn">Challenge</span>}
      {purpose === 'play' && support.level === 'limited' && <span className="fchip fchip--warn">Limited</span>}
      {purpose === 'play' && support.level === 'unsupported' && <span className="fchip fchip--bad">Not yet</span>}
      {f.teambuilderLevel === 50 && <span className="fchip">Lv 50</span>}
    </>
  );
}

function Detail({ row, purpose, onOpenTeams }: { row: Row; purpose: Purpose; onOpenTeams?: () => void }) {
  const { f, support } = row;
  const rules = useFormatRules(f.id);
  const teamsState = useTeamStore();
  const mine = teamsState.teams.filter((t) => t.format === f.teamFormat);
  const chosen = pickTeam(teamsState, f.teamFormat);
  return (
    <div className="fd">
      <h3 className="fd__title">{f.name}</h3>
      <div className="fd__chips">
        <span className="fchip">Gen {f.gen}</span>
        {f.section && <span className="fchip">{f.section}</span>}
        {f.searchShow && <span className="fchip">Ladder</span>}
        {f.challengeShow && <span className="fchip">Challenges</span>}
        {f.tournamentShow && <span className="fchip">Tournaments</span>}
        {rules?.known && <span className="fchip">{rules.gameType}</span>}
      </div>

      {purpose === 'play' && (
        <section className="fd__block">
          <h4>In Stellar</h4>
          <p className={`fd__status fd__status--${support.level}`}>
            <Icon name={support.level === 'full' ? 'shield' : 'alert'} size={16} />
            {row.ok || !row.why ? support.reason : row.why}
          </p>
        </section>
      )}

      <section className="fd__block">
        <h4>Team</h4>
        {f.isRandomFormat ? (
          <p>The server gives you a team — nothing to bring.</p>
        ) : mine.length === 0 ? (
          <p>You have no saved teams for {f.teamFormat === f.id ? 'this format' : `the base format`}. {onOpenTeams && <button className="link" onClick={onOpenTeams}>Open Team Builder</button>}</p>
        ) : (
          <p>{mine.length} compatible team{mine.length > 1 ? 's' : ''}. Using <b>{chosen?.name}</b>.</p>
        )}
        {f.needsTeam && f.teamFormat !== f.id && <p className="dim small">Variant of {f.teamFormat}; teams built for the base format work here.</p>}
      </section>

      <RulesBlock rules={rules} />
    </div>
  );
}

function RulesBlock({ rules }: { rules?: FormatRules }) {
  if (!rules) return <section className="fd__block"><h4>Rules</h4><p className="dim small">Loading rules…</p></section>;
  if (!rules.known) {
    return <section className="fd__block"><h4>Rules</h4><p className="dim small">This format is newer than the rule data bundled with Stellar. The server enforces its rules when you queue.</p></section>;
  }
  const bans = rules.banlist.slice(0, 14);
  return (
    <section className="fd__block">
      <h4>Rules</h4>
      {rules.desc && <p>{rules.desc}</p>}
      {rules.pickedTeamSize !== null && <p>Bring {rules.maxTeamSize}, pick {rules.pickedTeamSize} at team preview.</p>}
      {rules.ruleset.length > 0 && <div className="fd__chips">{rules.ruleset.slice(0, 12).map((r) => <span key={r} className="fchip">{r}</span>)}{rules.ruleset.length > 12 && <span className="fchip">+{rules.ruleset.length - 12}</span>}</div>}
      {bans.length > 0 && (
        <>
          <h5>Banned</h5>
          <p className="dim small">{bans.join(', ')}{rules.banlist.length > bans.length ? ` and ${rules.banlist.length - bans.length} more` : ''}</p>
        </>
      )}
      {rules.unbanlist.length > 0 && <p className="dim small">Unbanned: {rules.unbanlist.slice(0, 8).join(', ')}</p>}
    </section>
  );
}
