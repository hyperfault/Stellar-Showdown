import { Sets, Teams, Team, type Data } from '@pkmn/sets';
import type { Generation } from '@pkmn/data';
import type { PokemonSet } from '@pkmn/types';

/**
 * Team helpers. Showdown's packed team format is produced by `Sets.pack`
 * joined with ']' — exactly what the server expects in `/utm` payloads.
 * Paste import/export stays byte-compatible with the official client.
 */

// @pkmn/data's Generation is structurally compatible with @pkmn/sets' Data
// interface at runtime (same DataTable shapes for species/moves/etc.), but the
// nominal types differ, hence the cast.
const asData = (gen?: Generation): Data | undefined => gen as unknown as Data | undefined;

export function importTeamPaste(text: string, genFor?: Generation): Team | undefined {
  return Teams.importTeam(text, asData(genFor));
}

export function exportTeamPaste(team: Team, genFor?: Generation): string {
  return team.export(asData(genFor));
}

/** Packed format for `/utm` before /challenge or /search. */
export function packTeam(sets: ReadonlyArray<Partial<PokemonSet>>): string {
  return sets.map((s) => Sets.pack(s)).join(']');
}

export { Sets, Team, Teams };
export type { PokemonSet };
