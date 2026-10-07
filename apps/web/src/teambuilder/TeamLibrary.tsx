import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Dropdown } from '../components/Dropdown';
import { FormatPicker } from '../formats/FormatPicker';
import { useFormatSource } from '../formats/useFormatSource';
import { useTeamStore, type StoredTeam } from '../teams/store';
import { copyText, parseTeamsPaste, teamToPaste, teamsToBackup } from '../teams/paste';
import { loadValidation } from '../teams/validate';
import { showToast } from '../store';
import { ConfirmModal, PasteModal } from './PasteModal';
import { PokeIcon } from './PokeIcon';
import { Selector, type Option } from './Selector';

type Sort = 'recent' | 'name' | 'format' | 'created';
const SORTS: Option[] = [
  { id: 'recent', label: 'Recently edited' }, { id: 'name', label: 'Name' },
  { id: 'format', label: 'Format' }, { id: 'created', label: 'Newest' },
];

type Status = 'legal' | 'illegal' | 'unavailable' | 'empty';

/** Validate every team once the validator is loaded; recomputed only for teams that changed. */
function useStatuses(teams: StoredTeam[]): Record<string, { status: Status; count: number }> {
  const [map, setMap] = useState<Record<string, { status: Status; count: number; stamp: string }>>({});
  useEffect(() => {
    let live = true;
    loadValidation().then((m) => {
      if (!live) return;
      setMap((prev) => {
        const next = { ...prev };
        for (const t of teams) {
          const stamp = `${t.format}:${t.updatedAt}`;
          if (next[t.id]?.stamp === stamp) continue;
          if (!t.sets.length) { next[t.id] = { status: 'empty', count: 0, stamp }; continue; }
          const r = m.validateTeam(t.format, t.sets);
          next[t.id] = { status: r.status, count: r.problems.length, stamp };
        }
        return next;
      });
    }).catch(() => {});
    return () => { live = false; };
  }, [teams]);
  return map;
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
function ago(ts: number): string {
  const s = Math.round((ts - Date.now()) / 1000);
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [[60, 'second'], [3600, 'minute'], [86400, 'hour'], [604800, 'day'], [2629800, 'week'], [31557600, 'month']];
  let div = 1;
  for (const [limit, unit] of steps) {
    if (Math.abs(s) < limit) return rtf.format(Math.round(s / div), unit);
    div = limit;
  }
  return rtf.format(Math.round(s / 31557600), 'year');
}

export function TeamLibrary({ onOpen }: { onOpen: (id: string) => void }) {
  const { teams, create, duplicate, remove, addMany } = useTeamStore();
  const { formats } = useFormatSource();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [formatFilter, setFormatFilter] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFormat, setImportFormat] = useState('');
  const [importFormatOpen, setImportFormatOpen] = useState(false);
  const [exportAll, setExportAll] = useState(false);
  const [single, setSingle] = useState<StoredTeam | null>(null);
  const [doomed, setDoomed] = useState<StoredTeam | null>(null);
  const statuses = useStatuses(teams);

  const nameOf = (id: string) => formats.find((f) => f.id === id)?.name ?? id;
  const defaultFormat = importFormat || teams[0]?.format || 'gen9ou';

  const formatOptions = useMemo<Option[]>(() => [{ id: '', label: 'All formats' },
    ...[...new Set(teams.map((t) => t.format))].sort().map((f) => ({ id: f, label: nameOf(f) }))], [teams, formats]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = teams.filter((t) => (!formatFilter || t.format === formatFilter) &&
      (!q || t.name.toLowerCase().includes(q) || nameOf(t.format).toLowerCase().includes(q) || t.sets.some((s) => s.species.toLowerCase().includes(q) || s.item.toLowerCase().includes(q))));
    const by: Record<Sort, (a: StoredTeam, b: StoredTeam) => number> = {
      recent: (a, b) => b.updatedAt - a.updatedAt, created: (a, b) => b.createdAt - a.createdAt,
      name: (a, b) => a.name.localeCompare(b.name), format: (a, b) => a.format.localeCompare(b.format) || a.name.localeCompare(b.name),
    };
    return list.sort(by[sort]);
  }, [teams, query, formatFilter, sort, formats]); // eslint-disable-line react-hooks/exhaustive-deps

  const doImport = (text: string) => {
    const parsed = parseTeamsPaste(text, defaultFormat);
    if (!parsed.length) return 'No Pokémon found — paste a Pokémon Showdown team export (or a backup with === headers ===).';
    const ids = addMany(parsed.map((p, i) => ({ format: p.format, name: p.name || `Imported ${i + 1}`, sets: p.sets })));
    showToast(`Imported ${ids.length} team${ids.length > 1 ? 's' : ''}.`);
    if (ids.length === 1) onOpen(ids[0]!);
  };

  return (
    <div className="tl">
      <header className="tl__head">
        <div>
          <h1 className="tl__title">Team Builder</h1>
          <p className="dim">{teams.length ? `${teams.length} team${teams.length > 1 ? 's' : ''}` : 'Build, import and manage your teams'}</p>
        </div>
        <div className="tl__actions">
          <button className="btn btn--primary btn--sm" onClick={() => setNewOpen(true)}><Icon name="plus" size={16} /> New team</button>
          <button className="btn btn--ghost" onClick={() => setImportOpen(true)}><Icon name="download" size={14} /> Import</button>
          <button className="btn btn--ghost" disabled={!teams.length} onClick={() => setExportAll(true)}><Icon name="upload" size={14} /> Export all</button>
        </div>
      </header>

      {teams.length > 0 && (
        <div className="tl__bar">
          <label className="fp__search tl__search"><Icon name="search" size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search teams, Pokémon, items" aria-label="Search teams" /></label>
          <Selector label="Format" value={formatFilter} options={formatOptions} onChange={setFormatFilter} className="tl__sel" />
          <Selector label="Sort" value={sort} options={SORTS} onChange={(v) => setSort(v as Sort)} className="tl__sel" />
        </div>
      )}

      {teams.length === 0 ? (
        <div className="tl__empty">
          <div className="tl__empty-icons">{['Garchomp', 'Gholdengo', 'Kingambit'].map((s) => <PokeIcon key={s} species={s} scale={2} />)}</div>
          <h2>No teams yet</h2>
          <p className="dim">Start from scratch or bring a team over from Pokémon Showdown.</p>
          <div className="tl__actions">
            <button className="btn btn--primary btn--sm" onClick={() => setNewOpen(true)}><Icon name="plus" size={16} /> New team</button>
            <button className="btn btn--ghost" onClick={() => setImportOpen(true)}><Icon name="download" size={14} /> Import from Showdown</button>
          </div>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty">No teams match your filters.</div>
      ) : (
        <ul className="tl__grid">
          {shown.map((t) => {
            const st = statuses[t.id];
            return (
              <li key={t.id}>
                <article className="tcard">
                  <button className="tcard__open" onClick={() => onOpen(t.id)} aria-label={`Open ${t.name}`}>
                    <span className="tcard__top">
                      <b className="tcard__name">{t.name || 'Untitled'}</b>
                      {st && st.status !== 'unavailable' && (
                        <span className={`status status--${st.status === 'legal' ? 'legal' : st.status === 'illegal' ? 'illegal' : 'unknown'}`}>
                          <Icon name={st.status === 'legal' ? 'shield' : 'alert'} size={12} />
                          {st.status === 'legal' ? 'Legal' : st.status === 'illegal' ? `${st.count} issue${st.count > 1 ? 's' : ''}` : 'Empty'}
                        </span>
                      )}
                    </span>
                    <span className="tcard__icons">
                      {Array.from({ length: 6 }, (_, i) => <PokeIcon key={i} species={t.sets[i]?.species} scale={1.5} />)}
                    </span>
                    <span className="tcard__meta"><span className="fchip">{nameOf(t.format)}</span><span className="dim small">Edited {ago(t.updatedAt)}</span></span>
                  </button>
                  <Dropdown align="right" renderTrigger={(p) => <button className="icon-btn tcard__more" {...p} aria-label={`Actions for ${t.name}`}><Icon name="menu" size={16} /></button>}>
                    {(close) => (<>
                      <button role="menuitem" className="dd__item" onClick={() => { close(); onOpen(t.id); }}><Icon name="edit" size={16} />Edit</button>
                      <button role="menuitem" className="dd__item" onClick={() => { close(); const id = duplicate(t.id); if (id) showToast('Team duplicated.'); }}><Icon name="copy" size={16} />Duplicate</button>
                      <button role="menuitem" className="dd__item" onClick={async () => { close(); showToast((await copyText(teamToPaste(t))) ? 'Team copied — paste it into Pokémon Showdown.' : 'Could not copy to the clipboard.'); }}><Icon name="copy" size={16} />Copy paste</button>
                      <button role="menuitem" className="dd__item" onClick={() => { close(); setSingle(t); }}><Icon name="upload" size={16} />Export…</button>
                      <button role="menuitem" className="dd__item dd__item--danger" onClick={() => { close(); setDoomed(t); }}><Icon name="trash" size={16} />Delete</button>
                    </>)}
                  </Dropdown>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <FormatPicker open={newOpen} onClose={() => setNewOpen(false)} purpose="team" value={formatFilter || teams[0]?.format}
        onSelect={(id) => onOpen(create({ format: formats.find((f) => f.id === id)?.teamFormat ?? id }))} />
      <FormatPicker open={importFormatOpen} onClose={() => setImportFormatOpen(false)} purpose="team" value={defaultFormat}
        onSelect={(id) => setImportFormat(formats.find((f) => f.id === id)?.teamFormat ?? id)} />
      <PasteModal open={importOpen} onClose={() => setImportOpen(false)} mode="import" title="Import teams" onImport={doImport}
        note="Paste one team, or several teams exported from Showdown's backup (=== [format] name === headers)."
        extra={<div className="paste__fmt"><span className="dim small">Format when the paste doesn't say</span>
          <button className="btn btn--ghost" onClick={() => setImportFormatOpen(true)}>{nameOf(defaultFormat)} <Icon name="chevron" size={14} /></button></div>} />
      <PasteModal open={exportAll} onClose={() => setExportAll(false)} mode="export" title="Export all teams" text={teamsToBackup(teams)} filename="stellar-teams.txt"
        note="Showdown backup format: each team starts with a === [format] name === line." />
      {single && <PasteModal open onClose={() => setSingle(null)} mode="export" title={`Export ${single.name}`} text={teamToPaste(single)} filename={`${single.name || 'team'}.txt`} />}
      <ConfirmModal open={!!doomed} onClose={() => setDoomed(null)} title="Delete team" confirmLabel="Delete"
        message={`Delete “${doomed?.name}”? This can't be undone — export it first if you might want it back.`} onConfirm={() => doomed && remove(doomed.id)} />
    </div>
  );
}
