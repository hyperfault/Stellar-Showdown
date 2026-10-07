import { useEffect, useMemo, useState } from 'react';
import type { Generation, PokemonSet } from '@stellar/core';
import { Icon } from '../components/Icon';
import { learnableMoves } from '../data/dex';
import { mechanicsFor, STATS, STAT_LABEL, type StatKey } from '../data/mechanics';
import { MAX_EV, MAX_EVS_TOTAL, evTotal } from '../teams/sets';
import { ItemIcon, PokemonArt } from './PokeIcon';
import { Selector, type Option } from './Selector';
import { TypeBadge } from './TypeBadge';
import { typeColor } from '../typeColors';

interface Props {
  set: PokemonSet;
  gen: Generation;
  issues: string[];
  onChange: (next: PokemonSet) => void;
  onPickSpecies: () => void;
  onRemove: () => void;
  onPaste: () => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function SetEditor({ set, gen, issues, onChange, onPickSpecies, onRemove, onPaste }: Props) {
  const mech = mechanicsFor(gen.num);
  const sp = gen.species.get(set.species);
  const [learn, setLearn] = useState<Set<string>>(new Set());
  const up = (patch: Partial<PokemonSet>) => onChange({ ...set, ...patch });

  useEffect(() => {
    let live = true;
    if (sp) learnableMoves(gen, sp.id).then((l) => live && setLearn(l));
    return () => { live = false; };
  }, [gen, sp?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo<Option[]>(() => [...gen.items].sort((a, b) => a.name.localeCompare(b.name))
    .map((i) => ({ id: i.name, label: i.name, lead: <ItemIcon item={i.name} />, hint: i.shortDesc })), [gen]);

  const abilities = useMemo<Option[]>(() => {
    const own = new Map<string, string>();
    if (sp) for (const [slot, name] of Object.entries(sp.abilities)) if (name && !own.has(name)) own.set(name, slot === 'H' ? 'Hidden' : slot === 'S' ? 'Special' : '');
    const opt = (name: string, group: string): Option => ({ id: name, label: name, group, hint: gen.abilities.get(name)?.shortDesc, meta: own.get(name) || undefined });
    const rest = [...gen.abilities].filter((a) => !own.has(a.name)).sort((a, b) => a.name.localeCompare(b.name));
    return [...[...own.keys()].map((n) => opt(n, 'This Pokémon')), ...rest.map((a) => opt(a.name, 'Other abilities'))];
  }, [gen, sp]);

  const natures = useMemo<Option[]>(() => [...gen.natures].sort((a, b) => a.name.localeCompare(b.name)).map((n) => ({
    id: n.name, label: n.name,
    meta: n.plus && n.minus ? <span className="nat"><b>+{STAT_LABEL[n.plus as StatKey]}</b> <i>−{STAT_LABEL[n.minus as StatKey]}</i></span> : <span className="dim">neutral</span>,
  })), [gen]);

  const teraTypes = useMemo<Option[]>(() => [...gen.types].filter((t) => t.name !== '???')
    .map((t) => ({ id: t.name, label: t.name, lead: <i className="tdot" style={{ background: typeColor(t.name) }} /> })), [gen]);

  const moveOptions = useMemo<Option[]>(() => {
    const taken = new Set(set.moves);
    const can = (id: string) => learn.has(id.startsWith('hiddenpower') ? 'hiddenpower' : id);
    const mk = (m: ReturnType<typeof gen.moves.get> & object, group: string): Option => ({
      id: m!.name, label: m!.name, group, lead: <TypeBadge type={m!.type} small />,
      meta: <span className="mv">{m!.category === 'Status' ? 'Status' : `${m!.category === 'Physical' ? 'Phys' : 'Spec'} ${m!.basePower || '—'}`}</span>,
      hint: m!.shortDesc,
    });
    const all = [...gen.moves].filter((m) => !taken.has(m.name)).sort((a, b) => a.name.localeCompare(b.name));
    const learnable = all.filter((m) => can(m.id)).map((m) => mk(m, 'Learnable'));
    const others = all.filter((m) => !can(m.id)).map((m) => mk(m, learn.size ? 'Not in learnset (may be illegal)' : 'All moves'));
    return [...learnable, ...others];
  }, [gen, learn, set.moves]);

  const setMove = (slot: number, id: string) => {
    const moves = [...set.moves];
    moves[slot] = id;
    up({ moves: moves.filter(Boolean).slice(0, 4) });
  };

  const nature = mech.natures ? gen.natures.get(set.nature) : undefined;
  const setEv = (stat: StatKey, raw: number) => {
    const others = evTotal(set) - (set.evs[stat] ?? 0);
    const limit = mech.oldStats ? MAX_EV : Math.min(MAX_EV, MAX_EVS_TOTAL - others);
    up({ evs: { ...set.evs, [stat]: Math.max(0, Math.min(limit, Math.round(raw) || 0)) } });
  };
  const setIv = (stat: StatKey, raw: number) => up({ ivs: { ...set.ivs, [stat]: Math.max(0, Math.min(31, Math.round(raw) || 0)) } });
  const calc = (stat: StatKey) => {
    if (!sp) return 0;
    return gen.stats.calc(stat, sp.baseStats[stat], set.ivs[stat] ?? 31, set.evs[stat] ?? 0, set.level || 100, nature);
  };
  const total = evTotal(set);

  return (
    <div className="se">
      <aside className="se__side">
        <div className="se__art"><PokemonArt species={set.species} shiny={set.shiny} /></div>
        <button className="se__species" onClick={onPickSpecies} aria-label={`Change Pokémon, currently ${set.species}`}>
          <span>{set.species}</span><Icon name="swap" size={16} />
        </button>
        {sp && <div className="se__types">{sp.types.map((t) => <TypeBadge key={t} type={t} />)}</div>}
        <ul className="se__stats" aria-label="Stats">
          {STATS.map((s) => {
            const mod = nature?.plus === s ? 'up' : nature?.minus === s ? 'down' : '';
            return (
              <li key={s} className={mod}>
                <span className="se__sl">{STAT_LABEL[s]}</span>
                <span className="se__bar"><i style={{ width: `${Math.min(100, ((sp?.baseStats[s] ?? 0) / 255) * 100)}%` }} /></span>
                <span className="se__sb">{sp?.baseStats[s] ?? 0}</span>
                <b className="se__sv">{calc(s)}</b>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="se__main">
        <div className="se__row">
          <label className="field field--grow"><span>Nickname</span>
            <input value={set.name === set.species ? '' : set.name} placeholder={set.species} maxLength={18} onChange={(e) => up({ name: e.target.value })} /></label>
          <label className="field field--sm"><span>Level</span>
            <input type="number" min={1} max={100} value={set.level ?? 100} onChange={(e) => up({ level: Math.max(1, Math.min(100, Number(e.target.value) || 100)) })} /></label>
          {mech.gender && !sp?.gender && (
            <div className="field"><span>Gender</span>
              <div className="seg" role="group" aria-label="Gender">
                {(['M', 'F'] as const).map((g) => (
                  <button key={g} className={set.gender === g ? 'is-on' : ''} aria-pressed={set.gender === g} onClick={() => up({ gender: set.gender === g ? '' : g })}>{g === 'M' ? '♂' : '♀'}</button>
                ))}
              </div>
            </div>
          )}
          {mech.shiny && (
            <div className="field"><span>Shiny</span>
              <button className={`tog${set.shiny ? ' is-on' : ''}`} role="switch" aria-checked={!!set.shiny} onClick={() => up({ shiny: !set.shiny || undefined })}><i /></button>
            </div>
          )}
        </div>

        <div className="se__grid">
          {mech.items && <Selector label="Item" value={set.item} options={items} clearable lead={<ItemIcon item={set.item} />} onChange={(v) => up({ item: v })} placeholder="No item" />}
          {mech.abilities && <Selector label="Ability" value={set.ability} options={abilities} onChange={(v) => up({ ability: v })} />}
          {mech.natures && <Selector label="Nature" value={set.nature} options={natures} onChange={(v) => up({ nature: v })} />}
          {mech.tera && <Selector label="Tera Type" value={set.teraType ?? ''} options={teraTypes} clearable placeholder={sp ? `${sp.types[0]} (default)` : 'Default'}
            lead={set.teraType ? <i className="tdot" style={{ background: typeColor(set.teraType) }} /> : undefined} onChange={(v) => up({ teraType: (v || undefined) as PokemonSet['teraType'] })} />}
        </div>

        <h4 className="se__h">Moves</h4>
        <div className="se__grid">
          {[0, 1, 2, 3].map((i) => (
            <Selector key={i} label={`Move ${i + 1}`} value={set.moves[i] ?? ''} options={moveOptions} clearable={!!set.moves[i]} placeholder={i === set.moves.length ? 'Add a move' : '—'}
              disabled={i > set.moves.length} onChange={(v) => setMove(i, v)} />
          ))}
        </div>

        <div className="se__evhead">
          <h4 className="se__h">{mech.oldStats ? 'Stat Exp' : 'EVs'}{!mech.oldStats && <> <span className={`dim small${total > MAX_EVS_TOTAL ? ' bad' : ''}`}>{total} / {MAX_EVS_TOTAL}</span></>}</h4>
          {!mech.oldStats && <button className="link" onClick={() => up({ evs: Object.fromEntries(STATS.map((s) => [s, 0])) as PokemonSet['evs'] })}>Reset</button>}
        </div>
        <ul className="evs">
          {STATS.map((s) => (
            <li key={s}>
              <span className="evs__l">{STAT_LABEL[s]}</span>
              <input type="range" min={0} max={MAX_EV} step={4} value={set.evs[s] ?? 0} aria-label={`${STAT_LABEL[s]} EVs`} onChange={(e) => setEv(s, Number(e.target.value))} />
              <input className="evs__n" type="number" min={0} max={MAX_EV} value={set.evs[s] ?? 0} aria-label={`${STAT_LABEL[s]} EV value`} onChange={(e) => setEv(s, Number(e.target.value))} />
              {!mech.oldStats && <input className="evs__n evs__iv" type="number" min={0} max={31} value={set.ivs[s] ?? 31} aria-label={`${STAT_LABEL[s]} IVs`} title="IV" onChange={(e) => setIv(s, Number(e.target.value))} />}
            </li>
          ))}
        </ul>
        {!mech.oldStats && <p className="dim small evs__legend">Right-hand column: IVs (0–31).</p>}

        {(mech.happiness || (mech.dynamax && sp?.canGigantamax)) && (
          <div className="se__row">
            {mech.happiness && <label className="field field--sm"><span>Happiness</span>
              <input type="number" min={0} max={255} value={set.happiness ?? 255} onChange={(e) => { const v = Math.max(0, Math.min(255, Number(e.target.value) || 0)); up({ happiness: v === 255 ? undefined : v }); }} /></label>}
            {mech.dynamax && <label className="field field--sm"><span>Dynamax Lv</span>
              <input type="number" min={0} max={10} value={set.dynamaxLevel ?? 10} onChange={(e) => { const v = Math.max(0, Math.min(10, Number(e.target.value) || 0)); up({ dynamaxLevel: v === 10 ? undefined : v }); }} /></label>}
            {mech.dynamax && sp?.canGigantamax && <div className="field"><span>Gigantamax</span>
              <button className={`tog${set.gigantamax ? ' is-on' : ''}`} role="switch" aria-checked={!!set.gigantamax} onClick={() => up({ gigantamax: !set.gigantamax || undefined })}><i /></button></div>}
          </div>
        )}

        {issues.length > 0 && (
          <ul className="issues" aria-label="Problems with this Pokémon">
            {issues.map((p) => <li key={p}><Icon name="alert" size={14} />{p}</li>)}
          </ul>
        )}

        <div className="se__actions">
          <button className="btn btn--ghost" onClick={onPaste}><Icon name="copy" size={14} /> Set paste</button>
          <button className="btn btn--ghost btn--danger" onClick={onRemove}><Icon name="trash" size={14} /> Remove</button>
        </div>
      </div>
    </div>
  );
}
