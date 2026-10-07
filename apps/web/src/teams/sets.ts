import type { Generation, PokemonSet } from '@stellar/core';
import { STATS } from '../data/mechanics';

const table = (v: number) => Object.fromEntries(STATS.map((s) => [s, v])) as PokemonSet['evs'];

/** A fresh, valid-shaped set for a species. */
export function blankSet(g: Generation, speciesName: string): PokemonSet {
  const sp = g.species.get(speciesName);
  const ability = g.num >= 3 && sp ? (sp.abilities[0] ?? '') : '';
  return {
    name: '', species: sp?.name ?? speciesName, item: '', ability,
    moves: [], nature: g.num >= 3 ? 'Serious' : '', gender: '',
    evs: table(g.num <= 2 ? 252 : 0), ivs: table(31), level: 100,
  };
}

export const TEAM_SIZE = 6;
export const MAX_EVS_TOTAL = 510;
export const MAX_EV = 252;

export const evTotal = (s: PokemonSet) => STATS.reduce((n, k) => n + (s.evs[k] ?? 0), 0);

/**
 * Fill in the fields the editor relies on. Pasted sets omit default EVs/IVs/level
 * (that's how Showdown exports them), so imported sets must be completed before use.
 * Export drops the defaults again, so paste text round-trips unchanged.
 */
export function normalizeSet(set: Partial<PokemonSet>, genNumber: number): PokemonSet {
  return {
    ...set,
    // No nickname == name equals the species; Showdown's export omits it either way.
    name: set.name && set.name !== set.species ? set.name : '',
    species: set.species ?? '',
    item: set.item ?? '',
    ability: set.ability ?? '',
    moves: [...(set.moves ?? [])],
    nature: set.nature ?? (genNumber >= 3 ? 'Serious' : ''),
    gender: set.gender ?? '',
    level: set.level || 100,
    evs: { ...table(genNumber <= 2 ? 252 : 0), ...set.evs },
    ivs: { ...table(31), ...set.ivs },
  };
}
