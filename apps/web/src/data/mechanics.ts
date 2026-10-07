/**
 * Which set fields exist in a generation. Mirrors what the official teambuilder
 * shows; legality is still decided by Showdown's validator, this only hides
 * fields that don't exist in older games.
 */
export interface Mechanics {
  gen: number;
  items: boolean;
  abilities: boolean;
  natures: boolean;
  gender: boolean;
  shiny: boolean;
  happiness: boolean;
  /** Gen 1–2 use stat experience / DVs instead of EVs / IVs (stored the same way). */
  oldStats: boolean;
  hiddenPower: boolean;
  tera: boolean;
  dynamax: boolean;
}

export function mechanicsFor(gen: number): Mechanics {
  return {
    gen,
    items: gen >= 2,
    abilities: gen >= 3,
    natures: gen >= 3,
    gender: gen >= 2,
    shiny: gen >= 2,
    happiness: gen >= 2 && gen <= 8,
    oldStats: gen <= 2,
    hiddenPower: gen >= 2 && gen <= 7,
    tera: gen === 9,
    dynamax: gen === 8,
  };
}

export const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
export type StatKey = (typeof STATS)[number];
export const STAT_LABEL: Record<StatKey, string> = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
