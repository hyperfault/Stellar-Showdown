import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { PokemonSprite, SpriteRow } from './PokemonSprite';
import type { FeaturedReplay, PlayerProfile, RecentBattle, Team } from '../services/types';

export const Column = ({ title, children }: { title: string; children: ReactNode }) =>
  <section className="col"><h2 className="col__title">{title}</h2>{children}</section>;

/** Intentional empty state for sections the backend doesn't serve yet. */
const Empty = ({ children }: { children: ReactNode }) => <div className="card empty">{children}</div>;

export const RecentBattles = ({ battles, onOpen }: { battles: RecentBattle[]; onOpen?: (id: string) => void }) => (
  <Column title="Recent battles">
    {battles.length === 0 && <Empty>No battles yet — your recent matches will show up here.</Empty>}
    {battles.map((b) => (
      <button key={b.id} className="card row" onClick={() => onOpen?.(b.id)}>
        <span className="row__left">
          <PokemonSprite mon={b.playerLead} /><span className="row__vs">vs</span><PokemonSprite mon={b.opponentLead} />
          <span className={`row__result row__result--${b.result}`}><b>{b.result === 'won' ? 'Won' : 'Lost'} {b.score}</b><small>{b.formatLabel}</small></span>
        </span>
        <span className="row__opp">{b.opponent}</span>
      </button>
    ))}
  </Column>
);

export const YourTeams = ({ teams, selectedId, onSelect }: { teams: Team[]; selectedId?: string; onSelect: (id: string) => void }) => (
  <Column title="Your teams">
    {teams.length === 0 && <Empty>No saved teams yet — the Stellar Team Builder is coming soon. Random Battle needs no team!</Empty>}
    {teams.map((t) => (
      <button key={t.id} className={`card row${t.id === selectedId ? ' row--selected' : ''}`} aria-pressed={t.id === selectedId} onClick={() => onSelect(t.id)}>
        <span className="row__name">{t.name}<small>Team</small></span>
        <SpriteRow members={t.members} />
      </button>
    ))}
  </Column>
);

export const LadderCard = ({ profile }: { profile?: PlayerProfile }) => (
  <Column title="Ladder">
    <div className="card ladder">
      <span>Rating: <b>{profile?.rating ?? '–'}</b></span>
      <span>GXE: <b>{profile?.gxe != null ? `${profile.gxe}%` : '–'}</b></span>
      <span>Rank: <b>{profile?.rank != null ? `#${profile.rank}` : '–'}</b></span>
      <span className="ladder__wide">Current format: <b>{profile?.currentFormat ?? '–'}</b></span>
    </div>
  </Column>
);

export const FeaturedReplays = ({ replays, onOpen }: { replays: FeaturedReplay[]; onOpen?: (id: string) => void }) => (
  <Column title="Featured / Recently played">
    {replays.length === 0 && <Empty>Replays you watch will appear here.</Empty>}
    {replays.length > 0 && (
      <div className="card featured">
        {replays.map((r) => (
          <button key={r.id} className="row" onClick={() => onOpen?.(r.id)}>
            <span className="row__name">{r.title}<small>{r.subtitle}</small></span><Icon name="right" size={16} className="chev" />
          </button>
        ))}
      </div>
    )}
  </Column>
);
