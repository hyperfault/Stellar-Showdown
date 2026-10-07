import { Dex } from '@pkmn/dex';
import { Generations, type Generation } from '@pkmn/data';

/** Shared Generations instance: dex data for every generation (gen 1–9). */
export const gens = new Generations(Dex);

export const CURRENT_GEN = 9;

export const gen = gens.get(CURRENT_GEN);

export { toID } from '@pkmn/data';
export type { Generation, Specie, Move, Item, Ability, Nature, ID, TypeName } from '@pkmn/data';

/**
 * Which slice of the dex a format works with:
 *  - standard: what exists in the generation (default)
 *  - natdex:   also the "Past" Pokémon/items/moves National Dex formats allow
 *  - all:      everything the dex knows (Hackmons, Custom Game)
 */
export type DexMode = 'standard' | 'natdex' | 'all';

type Exists = NonNullable<ConstructorParameters<typeof Generations>[1]>;
type Entry = Parameters<Exists>[0];

const isNoAbility = (d: Entry) => d.kind === 'Ability' && d.id === 'noability';
const natdexExists: Exists = (d) =>
  !!d.exists && !isNoAbility(d) && (!('isNonstandard' in d && d.isNonstandard) || d.isNonstandard === 'Past');
const everythingExists: Exists = (d) => !!d.exists && !isNoAbility(d);

const natdexGens = new Generations(Dex, natdexExists);
const allGens = new Generations(Dex, everythingExists);

export function dexModeFor(formatId: string): DexMode {
  if (/hackmons|customgame/.test(formatId)) return 'all';
  if (/nationaldex|natdex/.test(formatId)) return 'natdex';
  return 'standard';
}

export function generationFor(genNumber: number, mode: DexMode = 'standard'): Generation {
  const n = Math.min(9, Math.max(1, Math.trunc(genNumber) || CURRENT_GEN));
  return (mode === 'all' ? allGens : mode === 'natdex' ? natdexGens : gens).get(n as Parameters<Generations['get']>[0]);
}
