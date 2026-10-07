import type { PSClient } from '@stellar/core';
import type { FormatOption, PlayerProfile, StellarService, Team } from './types';
import { useTeamStore, type StoredTeam } from '../teams/store';
import { spriteIdOf } from '../data/dex';

/** The format that is selected before the player chooses another one. */
export const RANDOM_BATTLE_ID = 'gen9randombattle';

/** Stored team -> the UI's Team shape. */
export function toUiTeam(team: StoredTeam): Team {
  return {
    id: team.id,
    name: team.name,
    formatId: team.format,
    members: team.sets.filter((s) => s.species).map((s) => ({ species: s.species, spriteId: spriteIdOf(s.species) })),
  };
}

/** Live format list from the server (empty until the connection delivers it). */
function formatOptions(client: PSClient): FormatOption[] {
  return client.formats.map((f) => ({ id: f.id, label: f.name, playable: f.searchShow }));
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
 * existing PSClient and the local team library. No new networking — the client
 * stays the source of truth for everything that comes from the server.
 */
export function createShowdownService(client: PSClient): StellarService {
  return {
    getPlayerProfile: async () => toPlayerProfile(client.user),
    getTeams: async () => useTeamStore.getState().teams.map(toUiTeam),
    getSelectedTeam: async () => null,
    selectTeam: async () => {},
    getFormats: async () => formatOptions(client),
    getRecentBattles: async () => [],
    getFeaturedReplays: async () => [],
  };
}
