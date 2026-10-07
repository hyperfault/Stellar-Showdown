import { dexModeFor, formatGen, generationFor, type Generation, type Specie } from '@stellar/core';

/** The dex slice for a format id ("gen9ou" -> Gen 9 standard, "gen9nationaldex" -> NatDex, hackmons -> everything). */
export const dexForFormat = (formatId: string): Generation => generationFor(formatGen(formatId), dexModeFor(formatId));

const speciesCache = new WeakMap<Generation, Specie[]>();

/** All selectable species of a dex slice, in National Dex order. Cosmetic formes are folded into their base. */
export function listSpecies(g: Generation): Specie[] {
  let list = speciesCache.get(g);
  if (!list) {
    list = [...g.species].filter((s) => !s.isCosmeticForme).sort((a, b) => a.num - b.num || a.name.localeCompare(b.name));
    speciesCache.set(g, list);
  }
  return list;
}

const learnCache = new Map<string, Promise<Set<string>>>();

/** Move ids a species can learn in this generation (empty set if unknown). Cached. */
export function learnableMoves(g: Generation, speciesId: string): Promise<Set<string>> {
  const key = `${g.num}:${speciesId}`;
  let p = learnCache.get(key);
  if (!p) {
    p = g.learnsets.learnable(speciesId).then((res: unknown) => {
      if (res instanceof Set) return new Set<string>(res as Set<string>);
      return new Set<string>(Object.keys((res ?? {}) as Record<string, unknown>));
    }).catch(() => new Set<string>());
    learnCache.set(key, p);
  }
  return p;
}

/** Showdown sprite file id for a species name: lowercase, formes hyphenated ("Zoroark-Hisui" -> "zoroark-hisui", "Mr. Mime" -> "mrmime"). */
export const spriteIdOf = (speciesName: string): string => speciesName.toLowerCase().replace(/[^a-z0-9-]/g, '');
