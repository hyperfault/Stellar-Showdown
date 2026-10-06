// UI-facing data contracts. The real Showdown adapter should map into these shapes.
export type PresenceStatus = 'online' | 'away' | 'offline';

export interface PokemonRef { species: string; spriteId: string; }

export interface PlayerProfile {
  username: string;
  status: PresenceStatus;
  /** Ladder stats are optional: the backend only has them after a ratings query (later milestone). */
  rating?: number;
  gxe?: number;
  rank?: number;
  currentFormat?: string;
}

export interface Team { id: string; name: string; formatId: string; members: PokemonRef[]; }
/** `playable: false` renders the option disabled — a deliberate "coming soon" preset, not a broken entry. */
export interface FormatOption { id: string; label: string; playable?: boolean; }

export interface RecentBattle {
  id: string;
  opponent: string;
  formatLabel: string;
  result: 'won' | 'lost';
  score: string;
  playerLead: PokemonRef;
  opponentLead: PokemonRef;
}

export interface FeaturedReplay { id: string; title: string; subtitle: string; }

export interface StellarService {
  /** Undefined when nobody is logged in (the app gates the home screen on login). */
  getPlayerProfile(): Promise<PlayerProfile | undefined>;
  getTeams(): Promise<Team[]>;
  getSelectedTeam(): Promise<Team | null>;
  selectTeam(teamId: string): Promise<void>;
  getFormats(): Promise<FormatOption[]>;
  getRecentBattles(): Promise<RecentBattle[]>;
  getFeaturedReplays(): Promise<FeaturedReplay[]>;
}
