import { useEffect, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { Dropdown } from './Dropdown';
import { BackgroundVideo } from './BackgroundVideo';
import { useTheme } from './useTheme';
import type { PlayerProfile } from '../services/types';

export type ScreenId = 'play' | 'teams' | 'pokedex' | 'replays' | 'spectate' | 'search' | 'damage-calc' | 'type-chart' | 'settings';

interface NavItem { id: ScreenId; label: string; icon: IconName; stack?: boolean; }
const COLLECTION: NavItem[] = [
  { id: 'teams', label: 'Teams', icon: 'teams' }, { id: 'pokedex', label: 'Pokédex', icon: 'pokedex' },
  { id: 'replays', label: 'Replays', icon: 'replays' }, { id: 'spectate', label: 'Spectate', icon: 'spectate' },
];
const TOOLS: NavItem[] = [
  { id: 'search', label: 'Search', icon: 'search' }, { id: 'damage-calc', label: 'Damage Calculator', icon: 'calculator', stack: true },
  { id: 'type-chart', label: 'Type Chart', icon: 'typechart' }, { id: 'settings', label: 'Settings', icon: 'settings' },
];

interface Props {
  active: ScreenId;
  onNavigate: (id: ScreenId) => void;
  profile?: PlayerProfile;
  onLogout?: () => void;
  children: ReactNode;
  /** Open battle/chat rooms listed in the sidebar. */
  rooms?: ReactNode;
  /** Extra content for the topbar (e.g. connection status). */
  topbarExtra?: ReactNode;
  /** When true the content area is fixed-height for room views. */
  roomMode?: boolean;
}

export function AppShell({ active, onNavigate, profile, onLogout, children, rooms, topbarExtra, roomMode }: Props) {
  const [drawer, setDrawer] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    if (!drawer) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [drawer]);

  const go = (id: ScreenId) => { setDrawer(false); onNavigate(id); };
  const group = (label: string, items: NavItem[]) => (
    <nav aria-label={label}>
      <h2 className="nav__label">{label}</h2>
      <ul className="nav__group">
        {items.map((n) => (
          <li key={n.id}>
            <button className={`nav-btn${n.stack ? ' nav-btn--stack' : ''}`} aria-current={active === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
              <Icon name={n.icon} /><span>{n.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <>
      <BackgroundVideo />
      <div className={`shell${roomMode ? ' shell--room' : ''}`}>
        <aside className="sidebar" data-open={drawer}>
          <div className="brand"><Icon name="logo" size={38} /><span className="brand__name">Stellar<span>Showdown</span></span></div>
          <nav aria-label="Play">
            <h2 className="nav__label">Play</h2>
            <button className="btn btn--primary" aria-current={active === 'play' ? 'page' : undefined} onClick={() => go('play')}>
              <Icon name="play" size={20} /> Play
            </button>
          </nav>
          {rooms}
          {group('Collection', COLLECTION)}
          {group('Tools', TOOLS)}
        </aside>
        <div className="scrim" data-open={drawer} onClick={() => setDrawer(false)} />

        <div className="shell__main">
          <header className="topbar">
            <button className="icon-btn topbar__menu" aria-label="Open navigation" onClick={() => setDrawer(true)}><Icon name="menu" /></button>
            {topbarExtra}
            <button className="icon-btn" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
            </button>
            {profile && (
              <Dropdown align="right" renderTrigger={(p) => (
                <button className="user" {...p} aria-label={`Account menu for ${profile.username}`}>
                  <span className="user__avatar"><Icon name="user" size={20} /><i className="user__dot" data-status={profile.status} /></span>
                  <span className="user__text"><div className="user__name">{profile.username}</div><div className="user__status">{profile.status}</div></span>
                  <Icon name="chevron" size={16} className="user__chev" />
                </button>
              )}>
                {(close) => (<>
                  <button role="menuitem" className="dd__item" onClick={() => { close(); toggle(); }}>
                    <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />{theme === 'dark' ? 'Light mode' : 'Dark mode'}
                  </button>
                  <button role="menuitem" className="dd__item" onClick={() => { close(); go('settings'); }}><Icon name="settings" size={18} />Settings</button>
                  <button role="menuitem" className="dd__item" onClick={() => { close(); onLogout?.(); }}><Icon name="logout" size={18} />Log out</button>
                </>)}
              </Dropdown>
            )}
          </header>
          <main className="shell__content">{children}</main>
        </div>
      </div>
    </>
  );
}
