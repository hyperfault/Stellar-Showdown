import { useMemo, useState } from 'react';
import { exportSetPaste, importSetPaste, type PokemonSet } from '@stellar/core';
import { Icon } from '../components/Icon';
import { FormatPicker } from '../formats/FormatPicker';
import { useFormatSource } from '../formats/useFormatSource';
import { dexForFormat } from '../data/dex';
import { blankSet, normalizeSet, TEAM_SIZE } from '../teams/sets';
import { useTeamStore } from '../teams/store';
import { copyText, parseTeamsPaste, teamToPaste } from '../teams/paste';
import { useTeamValidation, validateOnServer } from '../teams/validate';
import { showToast, useAppStore } from '../store';
import { ConfirmModal, PasteModal } from './PasteModal';
import { PokeIcon } from './PokeIcon';
import { PokemonPicker } from './PokemonPicker';
import { SetEditor } from './SetEditor';
import { TypeBadge } from './TypeBadge';

export function TeamEditor({ teamId, onBack }: { teamId: string; onBack: () => void }) {
  const team = useTeamStore((s) => s.teams.find((t) => t.id === teamId));
  const update = useTeamStore((s) => s.update);
  const connected = useAppStore((s) => s.connected);
  const { formats } = useFormatSource();
  const [slot, setSlot] = useState(0);
  const [pickFor, setPickFor] = useState<number | null>(null);
  const [formatOpen, setFormatOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [setPasteOpen, setSetPasteOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [serverMsg, setServerMsg] = useState('');

  const format = team?.format ?? 'gen9ou';
  const gen = useMemo(() => dexForFormat(format), [format]);
  const check = useTeamValidation(format, team?.sets ?? []);
  if (!team) return <div className="card panel">That team no longer exists. <button className="link" onClick={onBack}>Back to teams</button></div>;

  const formatName = formats.find((f) => f.id === format)?.name ?? format;
  const sets = team.sets;
  const current = sets[slot];
  const setSets = (next: PokemonSet[]) => update(team.id, { sets: next });
  const slotIssues = check.state === 'done' ? check.slotProblems : [];

  const pick = (index: number, species: string) => {
    const next = [...sets];
    const old = next[index];
    next[index] = old ? { ...old, ...blankSet(gen, species), item: old.item, nature: old.nature, evs: old.evs, ivs: old.ivs, level: old.level, name: '' } : blankSet(gen, species);
    setSets(next);
    setSlot(index);
  };
  const remove = (index: number) => {
    const next = sets.filter((_, i) => i !== index);
    setSets(next);
    setSlot(Math.max(0, Math.min(index, next.length - 1)));
  };
  const move = (index: number, d: -1 | 1) => {
    const j = index + d;
    if (j < 0 || j >= sets.length) return;
    const next = [...sets];
    [next[index], next[j]] = [next[j]!, next[index]!];
    setSets(next);
    setSlot(j);
  };

  const importTeam = (text: string) => {
    const parsed = parseTeamsPaste(text, format)[0];
    if (!parsed) return 'No Pokémon found — paste a Pokémon Showdown team export.';
    update(team.id, { sets: parsed.sets });
    setSlot(0);
    showToast(`Imported ${parsed.sets.length} Pokémon.`);
  };

  const status = (() => {
    if (check.state === 'checking') return { cls: 'pending', text: 'Checking…', icon: 'shield' as const };
    if (check.status === 'legal') return { cls: 'legal', text: 'Legal', icon: 'shield' as const };
    if (check.status === 'illegal') return { cls: 'illegal', text: `${check.problems.length} problem${check.problems.length === 1 ? '' : 's'}`, icon: 'alert' as const };
    return { cls: 'unknown', text: 'Not checked', icon: 'alert' as const };
  })();

  return (
    <div className="te">
      <header className="te__head">
        <button className="icon-btn" onClick={onBack} aria-label="Back to team library"><Icon name="back" size={18} /></button>
        <input className="te__name" value={team.name} maxLength={40} aria-label="Team name" onChange={(e) => update(team.id, { name: e.target.value })} />
        <button className="btn btn--ghost" onClick={() => setFormatOpen(true)} aria-haspopup="dialog" title="Change the format this team is built for">
          {formatName} <Icon name="chevron" size={14} />
        </button>
        <span className={`status status--${status.cls}`} role="status"><Icon name={status.icon} size={14} />{status.text}</span>
        <span className="te__spacer" />
        <button className="btn btn--ghost" onClick={() => setImportOpen(true)}><Icon name="download" size={14} /> Import</button>
        <button className="btn btn--ghost" onClick={() => setExportOpen(true)}><Icon name="upload" size={14} /> Export</button>
        <button className="btn btn--ghost" onClick={async () => showToast((await copyText(teamToPaste(team))) ? 'Team copied — paste it into Pokémon Showdown.' : 'Could not copy to the clipboard.')}><Icon name="copy" size={14} /> Copy</button>
      </header>

      {check.state === 'done' && (check.teamProblems.length > 0 || (check.status === 'unavailable' && sets.length > 0)) && (
        <div className={`te__banner${check.status === 'unavailable' ? ' te__banner--info' : ''}`}>
          {check.status === 'unavailable' ? (
            <>
              <span><Icon name="alert" size={14} /> {formatName} isn't in the rule data bundled with Stellar, so the team can't be checked locally.</span>
              {connected && <button className="btn btn--ghost" onClick={async () => { setServerMsg('Asking the server…'); setServerMsg(await validateOnServer(format, sets)); }}>Check on server</button>}
              {serverMsg && <span className="te__server">{serverMsg}</span>}
            </>
          ) : (
            <ul>{check.teamProblems.map((p) => <li key={p}><Icon name="alert" size={14} />{p}</li>)}</ul>
          )}
        </div>
      )}

      <div className="te__body">
        <ol className="slots" aria-label="Team slots">
          {Array.from({ length: TEAM_SIZE }, (_, i) => {
            const s = sets[i];
            const bad = (slotIssues[i]?.length ?? 0) > 0;
            if (!s) {
              return (
                <li key={i}>
                  <button className="slot slot--empty" onClick={() => setPickFor(i)} disabled={i > sets.length} aria-label={`Add Pokémon to slot ${i + 1}`}>
                    <Icon name="plus" size={20} /><span>Add Pokémon</span>
                  </button>
                </li>
              );
            }
            const sp = gen.species.get(s.species);
            return (
              <li key={i}>
                <div className={`slot${i === slot ? ' is-active' : ''}`}>
                  <button className="slot__main" onClick={() => setSlot(i)} aria-current={i === slot} aria-label={`Slot ${i + 1}: ${s.species}`}>
                    <PokeIcon species={s.species} scale={1.5} />
                    <span className="slot__text">
                      <b>{s.name || s.species}{bad && <i className="slot__bad" title="Has problems" />}</b>
                      <span className="dim small">{[s.item, s.moves.length ? `${s.moves.length} move${s.moves.length > 1 ? 's' : ''}` : 'no moves'].filter(Boolean).join(' · ')}</span>
                      <span className="slot__types">{sp?.types.map((t) => <TypeBadge key={t} type={t} small />)}{s.teraType && <span className="slot__tera" title="Tera Type">◆ {s.teraType}</span>}</span>
                    </span>
                  </button>
                  <span className="slot__ord">
                    <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><Icon name="chevron" size={14} style={{ transform: 'rotate(180deg)' }} /></button>
                    <button aria-label="Move down" disabled={i === sets.length - 1} onClick={() => move(i, 1)}><Icon name="chevron" size={14} /></button>
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        <section className="te__editor" aria-label="Set editor">
          {current ? (
            <SetEditor key={`${slot}-${current.species}`} set={current} gen={gen} issues={slotIssues[slot] ?? []}
              onChange={(n) => setSets(sets.map((s, i) => (i === slot ? n : s)))}
              onPickSpecies={() => setPickFor(slot)} onRemove={() => setRemoveOpen(true)} onPaste={() => setSetPasteOpen(true)} />
          ) : (
            <div className="empty te__empty">
              <PokeIcon species="Pikachu" scale={3} />
              <p>Add your first Pokémon to start building.</p>
              <button className="btn btn--primary btn--sm" onClick={() => setPickFor(0)}>Choose Pokémon</button>
            </div>
          )}
        </section>
      </div>

      <PokemonPicker open={pickFor !== null} onClose={() => setPickFor(null)} gen={gen} current={pickFor !== null ? sets[pickFor]?.species : undefined}
        onPick={(species) => pickFor !== null && pick(pickFor, species)} />
      <FormatPicker open={formatOpen} onClose={() => setFormatOpen(false)} purpose="team" value={format}
        onSelect={(id) => update(team.id, { format: formats.find((f) => f.id === id)?.teamFormat ?? id })} />
      <PasteModal open={importOpen} onClose={() => setImportOpen(false)} mode="import" title="Import team" onImport={importTeam}
        note="Replaces this team's Pokémon with the pasted Pokémon Showdown team." />
      <PasteModal open={exportOpen} onClose={() => setExportOpen(false)} mode="export" title="Export team" text={teamToPaste(team)} filename={`${team.name || 'team'}.txt`}
        note="Standard Pokémon Showdown team text — paste it into the official Teambuilder." />
      {current && (
        <PasteModal open={setPasteOpen} onClose={() => setSetPasteOpen(false)} mode="import" title={`${current.species} — set paste`} text={exportSetPaste(current, gen)}
          note="Copy this set, or paste another set over it and press Import to replace this Pokémon."
          onImport={(text) => {
            const next = importSetPaste(text, gen);
            if (!next) return 'That does not look like a Pokémon Showdown set.';
            setSets(sets.map((s, i) => (i === slot ? normalizeSet(next, gen.num) : s)));
          }} />
      )}
      <ConfirmModal open={removeOpen} onClose={() => setRemoveOpen(false)} title="Remove Pokémon" confirmLabel="Remove"
        message={`Remove ${current?.name || current?.species || 'this Pokémon'} from the team?`} onConfirm={() => remove(slot)} />
    </div>
  );
}

