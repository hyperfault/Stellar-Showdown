import { describe, it, expect } from 'vitest';
import { getFormatRules, validateTeam } from '../src/validation';
import { importTeamPaste } from '../src/teams';
import { gen } from '../src/dex';

const set = (paste: string) => importTeamPaste(paste, gen)!.team;

describe('validation (delegates to the Showdown sim)', () => {
  it('accepts a legal OU set', () => {
    const r = validateTeam('gen9ou', set('Pikachu @ Light Ball\nAbility: Static\nEVs: 252 SpA / 4 SpD / 252 Spe\nTimid Nature\n- Thunderbolt\n- Surf\n'));
    expect(r.status).toBe('legal');
  });

  it('reports Showdown problems per slot', () => {
    const r = validateTeam('gen9ou', set('Mewtwo\nAbility: Pressure\n- Psystrike\n'));
    expect(r.status).toBe('illegal');
    expect(r.slotProblems[0]!.some((p) => /banned/i.test(p))).toBe(true);
  });

  it('is unavailable for random formats and unknown formats', () => {
    expect(validateTeam('gen9randombattle', []).status).toBe('unavailable');
    expect(validateTeam('gen9notarealformat', set('Pikachu\n- Surf\n')).status).toBe('unavailable');
  });

  it('exposes format rules where known', () => {
    const ou = getFormatRules('gen9ou');
    expect(ou.known && ou.gameType === 'singles' && ou.ruleset.length > 0).toBe(true);
    expect(getFormatRules('gen9doublesou').gameType).toBe('doubles');
    expect(getFormatRules('gen9nonexistent').known).toBe(false);
  });
});

describe('validation purity', () => {
  it('does not mutate the sets it validates', () => {
    const sets = set('Garchomp @ Leftovers\nAbility: Rough Skin\n- Earthquake\n');
    const before = JSON.stringify(sets);
    validateTeam('gen9ou', sets);
    expect(JSON.stringify(sets)).toBe(before);
  });
});
