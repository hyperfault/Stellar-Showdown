/**
 * Showdown-compatible team validation and format rules, backed by `@pkmn/sim`
 * (the actual Showdown simulator code and data). This module is heavy — import it
 * lazily: `await import('@stellar/core/validation')`.
 *
 * It does not define any legality rules of its own. Formats the bundled sim data
 * doesn't know (newer than this package version) report `known: false` so callers
 * can fall back to the server's `/vtm`.
 */
import { Dex, TeamValidator } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/types';

export interface FormatRules {
  known: boolean;
  id: string;
  name: string;
  gen: number;
  gameType: 'singles' | 'doubles' | 'triples' | 'rotation' | 'multi' | 'freeforall';
  /** 'random'-style formats get their team from the server. */
  randomTeam: boolean;
  desc: string;
  ruleset: string[];
  banlist: string[];
  unbanlist: string[];
  restricted: string[];
  /** Team size the player brings / actually picks at team preview (e.g. VGC: 6 / 4). */
  minTeamSize: number;
  maxTeamSize: number;
  pickedTeamSize: number | null;
  maxLevel: number;
  defaultLevel: number;
  adjustLevel: number | null;
}

export function getFormatRules(formatId: string): FormatRules {
  const f = Dex.formats.get(formatId);
  if (!f.exists) {
    const m = /^gen(\d)/.exec(formatId);
    return {
      known: false, id: formatId, name: formatId, gen: m ? Number(m[1]) : 9, gameType: 'singles', randomTeam: false,
      desc: '', ruleset: [], banlist: [], unbanlist: [], restricted: [], minTeamSize: 1, maxTeamSize: 6,
      pickedTeamSize: null, maxLevel: 100, defaultLevel: 100, adjustLevel: null,
    };
  }
  const rt = Dex.formats.getRuleTable(f);
  const gen = Number(/^gen(\d)/.exec(f.id)?.[1] ?? f.mod.replace(/\D/g, '')) || 9;
  return {
    known: true, id: f.id, name: f.name, gen, gameType: f.gameType as FormatRules['gameType'], randomTeam: !!f.team,
    desc: f.desc || '', ruleset: [...(f.ruleset ?? [])], banlist: [...(f.banlist ?? [])],
    unbanlist: [...(f.unbanlist ?? [])], restricted: [...(f.restricted ?? [])],
    minTeamSize: rt.minTeamSize ?? 1, maxTeamSize: rt.maxTeamSize ?? 6, pickedTeamSize: rt.pickedTeamSize ?? null,
    maxLevel: rt.maxLevel ?? 100, defaultLevel: rt.defaultLevel ?? 100, adjustLevel: rt.adjustLevel ?? null,
  };
}

export type ValidationStatus = 'legal' | 'illegal' | 'unavailable';

export interface TeamValidation {
  status: ValidationStatus;
  /** Every problem, as returned by Showdown's validator. */
  problems: string[];
  /** Problems attributed to a team slot (same order as the team); team-wide ones are in `teamProblems`. */
  slotProblems: string[][];
  teamProblems: string[];
}

export function validateTeam(formatId: string, sets: ReadonlyArray<Partial<PokemonSet>>): TeamValidation {
  const f = Dex.formats.get(formatId);
  if (!f.exists || f.team) return { status: 'unavailable', problems: [], slotProblems: sets.map(() => []), teamProblems: [] };
  const validator = TeamValidator.get(formatId);
  // The sim normalizes the sets it validates in place (names, moves, ...); validate copies so callers' state stays untouched.
  const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
  const problems = validator.validateTeam(copy(sets) as PokemonSet[]) ?? [];
  const slotProblems = sets.map((set) => {
    if (!set.species) return [] as string[];
    const own = validator.validateSet(copy(set) as PokemonSet, {}) ?? [];
    return own.filter((p) => problems.includes(p));
  });
  const claimed = new Set(slotProblems.flat());
  return {
    status: problems.length ? 'illegal' : 'legal',
    problems,
    slotProblems,
    teamProblems: problems.filter((p) => !claimed.has(p)),
  };
}

export interface BundledFormat { id: string; name: string; section: string; gen: number; gameType: string; randomTeam: boolean; }

/** Formats the bundled sim data knows about. Only a fallback for when the server's live list isn't available (offline team building). */
export function listBundledFormats(): BundledFormat[] {
  return Dex.formats.all()
    .filter((f) => f.exists && !f.name.includes('Custom Game') || f.id.endsWith('customgame'))
    .map((f) => ({
      id: f.id, name: f.name, section: f.section || 'Bundled formats',
      gen: Number(/^gen(\d)/.exec(f.id)?.[1] ?? 9), gameType: f.gameType as string, randomTeam: !!f.team,
    }));
}
