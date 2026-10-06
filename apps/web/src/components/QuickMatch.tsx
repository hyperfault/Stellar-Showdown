import { Dropdown } from './Dropdown';
import { Icon } from './Icon';
import { PokemonArtwork, SpriteRow } from './PokemonSprite';
import type { FormatOption, Team } from '../services/types';

interface Props {
  teams: Team[]; selectedTeam: Team | null; formats: FormatOption[]; formatId: string;
  onSelectTeam: (id: string) => void; onSelectFormat: (id: string) => void; onPlay: () => void;
  /** Sprite ids for the hero art, left to right. */
  heroIds?: [string, string];
  /** Integration: while matchmaking is running, the Play button becomes Cancel. */
  searching?: boolean;
}

export function QuickMatch({ teams, selectedTeam, formats, formatId, onSelectTeam, onSelectFormat, onPlay, heroIds = ['terapagos-stellar'], searching }: Props) {
  return (
    <section className="quick" aria-labelledby="quick-title">
      <div>
        <h2 className="quick__title" id="quick-title">Quick Match</h2>
        <p className="quick__sub">{searching ? 'Searching for an opponent…' : 'Find an opponent and battle'}</p>
      </div>
      <button className="btn btn--primary btn--lg" onClick={onPlay}>{searching ? 'Cancel' : 'Play'}</button>
      <div className="quick__controls">
        <Dropdown renderTrigger={(p) => (
          <button className="btn btn--ghost" {...p}>Change format</button>
        )}>
          {(close) => formats.map((f) => (
            <button key={f.id} role="option" aria-selected={f.id === formatId} className="dd__item" disabled={f.playable === false}
              onClick={() => { onSelectFormat(f.id); close(); }}>
              {f.label}{f.playable === false && <span className="dd__hint">Soon</span>}
            </button>
          ))}
        </Dropdown>
        {teams.length === 0 ? (
          // Random Battle needs no team and none are stored yet — show a static chip, not an empty menu.
          <span className="team-select team-select--static" aria-label="Random team">
            <span className="team-select__name">Random team</span>
          </span>
        ) : (
          <Dropdown renderTrigger={(p) => (
            <button className="team-select" {...p} aria-label="Choose team">
              {selectedTeam && <SpriteRow members={selectedTeam.members.slice(0, 4)} />}
              <span className="team-select__name">{selectedTeam?.name ?? 'Choose a team'}</span>
              <Icon name="chevron" size={16} className="chev" />
            </button>
          )}>
            {(close) => teams.map((t) => (
              <button key={t.id} role="option" aria-selected={t.id === selectedTeam?.id} className="dd__item" onClick={() => { onSelectTeam(t.id); close(); }}>
                <SpriteRow members={t.members.slice(0, 3)} />{t.name}
              </button>
            ))}
          </Dropdown>
        )}
      </div>
      <div className="hero-art" aria-hidden="true">
        <PokemonArtwork id={heroIds[0]} />
        <PokemonArtwork id={heroIds[1]} />
      </div>
    </section>
  );
}
