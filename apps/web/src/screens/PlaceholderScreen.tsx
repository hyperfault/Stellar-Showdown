import { Icon, type IconName } from '../components/Icon';
import type { ScreenId } from '../components/AppShell';

const INFO: Record<Exclude<ScreenId, 'play'>, { icon: IconName; title: string; blurb: string }> = {
  teams: {
    icon: 'teams',
    title: 'Teams',
    blurb: 'The Stellar Team Builder is being rebuilt from the ground up. Until it lands, Random Battle is fully playable — no team needed.',
  },
  pokedex: {
    icon: 'pokedex',
    title: 'Pokédex',
    blurb: 'A built-in Pokédex with stats, moves, and sets is on the way.',
  },
  replays: {
    icon: 'replays',
    title: 'Replays',
    blurb: 'Watch and share your battles here soon.',
  },
  spectate: {
    icon: 'spectate',
    title: 'Spectate',
    blurb: 'Live spectating is coming soon. Battles you join already appear under Rooms in the sidebar.',
  },
  search: {
    icon: 'search',
    title: 'Search',
    blurb: 'Search players, Pokémon, and more — coming soon.',
  },
  'damage-calc': {
    icon: 'calculator',
    title: 'Damage Calculator',
    blurb: 'An integrated damage calculator is coming soon.',
  },
  'type-chart': {
    icon: 'typechart',
    title: 'Type Chart',
    blurb: 'An interactive type chart is coming soon.',
  },
  settings: {
    icon: 'settings',
    title: 'Settings',
    blurb: 'Client customization — themes, scaling, and more — is coming soon.',
  },
};

/** Polished placeholder for sections that are not implemented yet. */
export function PlaceholderScreen({ id, onBack }: { id: Exclude<ScreenId, 'play'>; onBack: () => void }) {
  const info = INFO[id];
  return (
    <div className="placeholder">
      <div className="card placeholder__card">
        <span className="placeholder__icon"><Icon name={info.icon} size={30} /></span>
        <h1 className="placeholder__title">{info.title}</h1>
        <p className="placeholder__blurb">{info.blurb}</p>
        <button className="btn btn--ghost" onClick={onBack}>Back to Play</button>
      </div>
    </div>
  );
}
