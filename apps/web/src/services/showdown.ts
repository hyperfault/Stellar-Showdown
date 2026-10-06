import type { PSClient } from '@stellar/core';
import type { FormatOption, PlayerProfile, StellarService } from './types';

/** The one format that is fully playable end-to-end right now. */
export const RANDOM_BATTLE_ID = 'gen9randombattle';

/**
 * Preset format list. Only Random Battle is playable; the rest are deliberate
 * "coming soon" entries so the picker looks intentional rather than empty.
 * Labels prefer the live server format names when they have arrived.
 */
function formatOptions(client: PSClient): FormatOption[] {
  const live = (id: string, fallback: string) => client.formats.find((f) => f.id === id)?.name ?? fallback;
  return [
    { id: RANDOM_BATTLE_ID, label: live(RANDOM_BATTLE_ID, '[Gen 9] Random Battle'), playable: true },
    { id: 'gen9ou', label: live('gen9ou', '[Gen 9] OU'), playable: false },
    { id: 'gen9doublesou', label: live('gen9doublesou', '[Gen 9] Doubles OU'), playable: false },
    { id: 'gen9vgc2026', label: live('gen9vgc2026', '[Gen 9] VGC 2026'), playable: false },
  ];
}

/** Map the logged-in PS user to the UI profile shape. */
export function toPlayerProfile(user: PSClient['user']): PlayerProfile | undefined {
  if (!user || !user.named) return undefined;
  return {
    username: user.name,
    status: 'online',
    currentFormat: '[Gen 9] Random Battle',
    // rating/gxe/rank intentionally omitted — the backend has no ratings query yet;
    // the Ladder card renders '–' for them.
  };
}

/**
 * Adapter: implements the homepage's StellarService contract on top of the
 * existing PSClient. No new networking — the client stays the source of truth.
 * Teams / recent battles / replays return empty until their milestones land;
 * the panels render polished empty states for those.
 */
export function createShowdownService(client: PSClient): StellarService {
  return {
    getPlayerProfile: async () => toPlayerProfile(client.user),
    getTeams: async () => [],
    getSelectedTeam: async () => null,
    selectTeam: async () => {},
    getFormats: async () => formatOptions(client),
    getRecentBattles: async () => [],
    getFeaturedReplays: async () => [],
  };
}
