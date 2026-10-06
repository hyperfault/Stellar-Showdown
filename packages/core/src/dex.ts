import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';

/** Shared Generations instance: dex data for every generation (gen 1–9). */
export const gens = new Generations(Dex);

export const CURRENT_GEN = 9;

export const gen = gens.get(CURRENT_GEN);

export { toID } from '@pkmn/data';
