import { useEffect, useMemo, useState } from 'react';
import { Sprites } from '@pkmn/img';
import type { Pokemon } from '@pkmn/client';
import type { Side } from '@pkmn/client';
import type { Protocol } from '@pkmn/protocol';
import type { TypeName } from '@pkmn/data';
import {
  BattleRoom,
  buildMoveChoice,
  buildSwitchChoice,
  buildTeamChoice,
  requestMoveName,
} from '@stellar/core';
import { client } from '../client';
import { useAppStore } from '../store';
import { effectivenessLabel, typeColor } from '../typeColors';
import { formatLogLine, shortIdent } from '../battleLog';

// ---------- Pokémon HUD card ----------

const STAT_LABELS: Record<string, string> = {
  atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe', accuracy: 'Acc', evasion: 'Eva',
};

function PokemonCard({ pokemon, mine }: { pokemon: Pokemon; mine: boolean }) {
  const sprite = Sprites.getPokemon(pokemon.speciesForme, {
    gen: 'gen5ani',
    side: mine ? 'p1' : 'p2',
    shiny: pokemon.shiny,
    gender: pokemon.gender,
  });
  const hpFrac = pokemon.maxhp > 0 ? pokemon.hp / pokemon.maxhp : 0;
  const hpClass = hpFrac > 0.5 ? 'green' : hpFrac > 0.2 ? 'yellow' : 'red';
  const boosts = Object.entries(pokemon.boosts).filter(([, v]) => v && v !== 0);
  const status = pokemon.status;

  return (
    <div className="poke-card">
      <div className="name-row">
        <span className="name">{pokemon.name}</span>
        <span className="level">
          L{pokemon.level}
          {pokemon.gender !== 'N' && ` ${pokemon.gender === 'M' ? '♂' : '♀'}`}
        </span>
        {status && <span className={`status-badge status-${status}`}>{status}</span>}
        {pokemon.terastallized && (
          <span className="type-chip" style={{ background: typeColor(pokemon.terastallized) }}>
            Tera {pokemon.terastallized}
          </span>
        )}
      </div>
      <div className="types">
        {pokemon.types.map((t) => (
          <span key={t} className="type-chip" style={{ background: typeColor(t) }}>
            {t}
          </span>
        ))}
      </div>
      <div className="hp-bar">
        <div className={`hp-fill ${pokemon.hpcolor || hpClass}`} style={{ width: `${Math.max(0, hpFrac * 100)}%` }} />
      </div>
      <div className="hp-text">
        <span>HP</span>
        <span>
          {pokemon.hp}/{pokemon.maxhp}
        </span>
      </div>
      {boosts.length > 0 && (
        <div className="boost-chips">
          {boosts.map(([stat, v]) => (
            <span key={stat} className={(v ?? 0) > 0 ? 'up' : 'down'}>
              {(v ?? 0) > 0 ? `+${v}` : v} {STAT_LABELS[stat] ?? stat}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function PokeSlot({ pokemon, mine }: { pokemon: Pokemon | null; mine: boolean }) {
  if (!pokemon) return null;
  const sprite = Sprites.getPokemon(pokemon.speciesForme, {
    gen: 'gen5ani',
    side: mine ? 'p1' : 'p2',
    shiny: pokemon.shiny,
    gender: pokemon.gender,
  });
  return (
    <div className={`poke-slot ${mine ? '' : 'foe'}`}>
      <img
        className={`battle-sprite ${pokemon.fainted ? 'fainted' : ''}`}
        src={sprite.url}
        alt={pokemon.name}
        style={{ imageRendering: sprite.pixelated ? 'pixelated' : 'auto' }}
        draggable={false}
      />
      <PokemonCard pokemon={pokemon} mine={mine} />
    </div>
  );
}

// ---------- Field ribbon (weather / terrain / screens / hazards) ----------

function FieldRibbon({ mySide, foeSide, battle }: { mySide: Side | null; foeSide: Side | null; battle: NonNullable<BattleRoom['battle']> }) {
  const chips: string[] = [];
  if (battle.field.weather) chips.push(`☀ ${battle.field.weather}`);
  if (battle.field.terrain) chips.push(`⛰ ${battle.field.terrain} Terrain`);
  for (const id of Object.keys(battle.field.pseudoWeather)) chips.push(battle.field.pseudoWeather[id]!.id);
  const sideConds = (side: Side | null, label: string) => {
    if (!side) return;
    for (const [id, cond] of Object.entries(side.sideConditions)) {
      if (!cond.remove) chips.push(`${label}: ${cond.name || id}`);
    }
  };
  sideConds(foeSide, 'Foe');
  sideConds(mySide, 'You');
  if (chips.length === 0) return null;
  return (
    <div className="field-ribbon">
      {chips.map((c, i) => (
        <span key={`${c}-${i}`}>{c}</span>
      ))}
    </div>
  );
}

// ---------- Choice panel ----------

function dexSpecies(details: string): string {
  return details.split(',')[0] ?? details;
}

function TeamPreviewChoice({ room, request }: { room: BattleRoom; request: Protocol.TeamRequest }) {
  const mons = request.side?.pokemon ?? [];
  return (
    <div className="choice-panel">
      <div className="dim small">Team preview — choose your lead order (default: as listed).</div>
      <div className="switch-grid">
        {mons.map((p, i) => {
          const sprite = Sprites.getDexPokemon(dexSpecies(p.details));
          return (
            <div key={i} className="switch-btn">
              <img src={sprite.url} alt="" />
              <div>
                <div>{shortIdent(p.ident)}</div>
                <div className="cond">{dexSpecies(p.details)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="brow">
        <button
          className="btn btn--primary"
          onClick={() => client.choose(room.id, buildTeamChoice(mons.map((_, i) => i + 1)))}
        >
          Start battle
        </button>
      </div>
    </div>
  );
}

function MoveChoice({ room, request, battle, foeActive }: { room: BattleRoom; request: Protocol.MoveRequest; battle: NonNullable<BattleRoom['battle']>; foeActive: Pokemon | null }) {
  const [tera, setTera] = useState(false);
  const [dmax, setDmax] = useState(false);
  const [sentRqid, setSentRqid] = useState<number | null>(null);
  const active = request.active?.[0] ?? null;

  // A new request means the previous choice resolved — clear the "sent" state.
  useEffect(() => setSentRqid(null), [request.rqid]);

  if (!active) return <div className="request-wait">Waiting…</div>;
  if (sentRqid === request.rqid) {
    return (
      <div className="choice-panel">
        <div className="request-wait">
          Choice sent — waiting for opponent.{' '}
          <button className="btn btn--ghost" onClick={() => { client.undoChoice(room.id); setSentRqid(null); }}>Undo</button>
        </div>
      </div>
    );
  }

  const gendata = battle.gen;
  const useMax = dmax && !!active.maxMoves;
  const moveList = useMax ? active.maxMoves! : active.moves;
  const foeTypes = foeActive && !foeActive.fainted ? foeActive.types : null;

  return (
    <div className="choice-panel">
      <div className="brow">
        {active.canTerastallize && (
          <button className={`btn btn--ghost${tera ? ' active' : ''}`} onClick={() => setTera(!tera)}>
            ★ Terastallize ({active.canTerastallize})
          </button>
        )}
        {active.canDynamax && (
          <button className={`btn btn--ghost${dmax ? ' active' : ''}`} onClick={() => setDmax(!dmax)}>
            ⬢ Dynamax
          </button>
        )}
      </div>
      <div className="moves-grid">
        {moveList.map((m, i) => {
          const moveData = gendata.moves.get(m.id);
          const disabled = 'disabled' in m && m.disabled;
          const eff =
            !useMax && moveData && moveData.basePower > 0 && foeTypes
              ? effectivenessLabel(gendata.types.totalEffectiveness(moveData.type, foeTypes))
              : null;
          return (
            <button
              key={`${m.id}-${i}`}
              className={`move-btn ${disabled ? 'disabled-move' : ''}`}
              disabled={disabled}
              onClick={() => {
                client.choose(
                  room.id,
                  buildMoveChoice(i + 1, { terastallize: tera && !!active.canTerastallize, dynamax: useMax }),
                );
                setSentRqid(request.rqid);
              }}
            >
              <span className="move-name">{moveData?.name ?? requestMoveName(m)}</span>
              <span className="move-meta">
                {moveData && (
                  <>
                    <span className="type-chip" style={{ background: typeColor(moveData.type) }}>
                      {moveData.type}
                    </span>
                    <span>{moveData.category}</span>
                    {moveData.basePower > 0 && <span>{moveData.basePower} BP</span>}
                  </>
                )}
                {'pp' in m && <span>PP {m.pp}/{m.maxpp}</span>}
              </span>
              {eff && eff.label && <span className={`eff ${eff.tone}`}>{eff.label}</span>}
            </button>
          );
        })}
      </div>
      {!active.trapped && <SwitchGrid room={room} request={request} onSent={() => setSentRqid(request.rqid)} />}
      {active.trapped && <div className="dim small">Trapped — cannot switch.</div>}
    </div>
  );
}

function SwitchGrid({ room, request, onSent }: { room: BattleRoom; request: Protocol.MoveRequest | Protocol.SwitchRequest; onSent?: () => void }) {
  const party = request.side?.pokemon ?? [];
  return (
    <div className="switch-grid">
      {party.map((p, i) => {
        const fainted = p.condition.endsWith(' fnt') || p.condition.startsWith('0 ');
        if (p.active || fainted) return null;
        const sprite = Sprites.getDexPokemon(dexSpecies(p.details));
        return (
          <button
            key={i}
            className="switch-btn"
            onClick={() => {
              client.choose(room.id, buildSwitchChoice(i + 1));
              onSent?.();
            }}
          >
            <img src={sprite.url} alt="" />
            <div>
              <div>{shortIdent(p.ident)}</div>
              <div className="cond">{p.condition}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ChoicePanel({ room }: { room: BattleRoom }) {
  const battle = room.battle;
  const request = battle?.request;
  if (!battle) return null;

  const mySideId = room.ourSide ?? 'p1';
  const foeActive = battle[mySideId === 'p1' ? 'p2' : 'p1'].active[0] ?? null;

  if (room.winner || room.tied) {
    return <div className="request-wait">Battle over.</div>;
  }
  if (!room.ourSide) {
    return <div className="request-wait">Spectating — choices are made by the players.</div>;
  }
  if (!request || request.requestType === 'wait') {
    return <div className="request-wait">Waiting for opponent…</div>;
  }
  switch (request.requestType) {
    case 'team':
      return <TeamPreviewChoice room={room} request={request} />;
    case 'move':
      return <MoveChoice room={room} request={request} battle={battle} foeActive={foeActive} />;
    case 'switch':
      return (
        <div className="choice-panel">
          <div className="dim small">Choose a Pokémon to switch in:</div>
          <SwitchGrid room={room} request={request} />
        </div>
      );
    default:
      return <div className="request-wait">Waiting…</div>;
  }
}

// ---------- Battle log ----------

function BattleLog({ room }: { room: BattleRoom }) {
  const entries = useMemo(
    () =>
      room.log
        .map((line, i) => ({ entry: formatLogLine(line), key: i }))
        .filter((x): x is { entry: NonNullable<ReturnType<typeof formatLogLine>>; key: number } => x.entry !== null),
    [room.log, room.version],
  );
  const ref = (el: HTMLDivElement | null) => {
    if (el) el.scrollTop = el.scrollHeight;
  };
  return (
    <div className="battle-log" ref={ref}>
      {entries.map(({ entry, key }) => (
        <div key={key} className={entry.cls === 'turn' ? 'turn-marker' : `log-${entry.cls}`}>
          {entry.text}
        </div>
      ))}
    </div>
  );
}

// ---------- Screen ----------

export default function BattleScreen({ roomid }: { roomid: string }) {
  useAppStore((s) => s.tick); // re-render on every room mutation
  const setView = useAppStore((s) => s.setView);
  const [chatText, setChatText] = useState('');
  const room = client.getRoom<BattleRoom>(roomid);

  if (!(room instanceof BattleRoom)) return <div className="card panel">Battle room not found.</div>;

  const battle = room.battle;
  const mySideId = room.ourSide ?? 'p1';
  const mySide = battle ? (mySideId === 'p1' ? battle.p1 : battle.p2) : null;
  const foeSide = battle ? (mySideId === 'p1' ? battle.p2 : battle.p1) : null;
  const myActive = mySide?.active[0] ?? null;
  const foeActive = foeSide?.active[0] ?? null;

  return (
    <div className="battle-root">
      <div className="battle-main">
        <div className="battle-topbar">
          <strong>{room.title || roomid}</strong>
          {battle?.tier && <span className="tier">{battle.tier}</span>}
          {battle !== null && battle.turn > 0 && <span className="dim small">Turn {battle.turn}</span>}
          <span className="grow" />
          <button className="btn btn--ghost" onClick={() => client.startTimer(roomid)}>Timer</button>
          {!room.winner && !room.tied && room.ourSide && (
            <button className="btn btn--ghost btn--danger" onClick={() => client.forfeit(roomid)}>
              Forfeit
            </button>
          )}
          <button
            className="btn btn--ghost"
            onClick={() => {
              client.leave(roomid);
              setView({ kind: 'screen', screen: 'play' });
            }}
          >
            Close
          </button>
        </div>

        {(room.winner || room.tied) && (
          <div className="card panel" style={{ borderColor: 'var(--c-accent)' }}>
            <strong>{room.tied ? 'Battle ended in a tie.' : `${room.winner} won the battle!`}</strong>
          </div>
        )}

        <div className="field">
          {battle && <FieldRibbon mySide={mySide} foeSide={foeSide} battle={battle} />}
          <div>
            <div className="dim small" style={{ marginBottom: 4 }}>
              {foeSide?.name || 'Opponent'}
              {foeSide?.rating && ` (${foeSide.rating})`}
            </div>
            <PokeSlot pokemon={foeActive} mine={false} />
          </div>
          <div>
            <PokeSlot pokemon={myActive} mine />
            <div className="dim small" style={{ marginTop: 4, textAlign: 'right' }}>
              {mySide?.name || 'You'}
              {mySide?.rating && ` (${mySide.rating})`}
            </div>
          </div>
        </div>

        <div className="card panel">
          <ChoicePanel room={room} />
        </div>
      </div>

      <div className="battle-side">
        <BattleLog room={room} />
        <div className="battle-chat-input">
          <input
            placeholder="Chat…"
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && chatText.trim()) {
                client.sendChat(roomid, chatText.trim());
                setChatText('');
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
