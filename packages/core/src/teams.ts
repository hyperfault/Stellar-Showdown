import { Sets, Teams, Team, type Data } from '@pkmn/sets';
import type { Generation } from '@pkmn/data';
import type { PokemonSet } from '@pkmn/types';

/**
 * Team helpers. Showdown's packed team format is produced by `Sets.pack`
 * joined with ']' — exactly what the server expects in `/utm` payloads.
 * Paste import/export stays byte-compatible with the official client.
 */

// @pkmn/sets wants the dex-shaped `Data` (species/abilities/natures/...). That is
// `generation.dex`, NOT the Generation object itself: passing the Generation makes
// `export` silently drop Ability / EVs / Nature / Shiny / Gender lines.
const dexOf = (gen?: Generation): Data | undefined => gen?.dex as unknown as Data | undefined;

export function importTeamPaste(text: string, genFor?: Generation): Team | undefined {
  return Teams.importTeam(text, dexOf(genFor));
}

// @pkmn/sets fills defaults into the sets it is given while exporting; work on copies so callers' state is never mutated.
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function exportTeamPaste(team: Team | ReadonlyArray<Partial<PokemonSet>>, genFor?: Generation): string {
  const sets = team instanceof Team ? team.team : (team as PokemonSet[]);
  return new Team(copy(sets as PokemonSet[])).export(dexOf(genFor));
}

/** A single set as Showdown paste text. */
export function exportSetPaste(set: Partial<PokemonSet>, genFor?: Generation): string {
  return Sets.exportSet(copy(set) as PokemonSet, dexOf(genFor));
}

/** Parse one set from paste text; undefined if it isn't a recognizable set. */
export function importSetPaste(text: string, genFor?: Generation): PokemonSet | undefined {
  const set = Sets.importSet(text.trim(), dexOf(genFor)) as PokemonSet | undefined;
  return set && set.species ? set : undefined;
}

/** Packed format for `/utm` before /challenge or /search. */
export function packTeam(sets: ReadonlyArray<Partial<PokemonSet>>): string {
  return sets.map((s) => Sets.pack(s)).join(']');
}

export { Sets, Team, Teams };
export type { PokemonSet };
