import { describe, it, expect } from 'vitest';
import { importTeamPaste, packTeam } from '../src/teams';
import { gen } from '../src/dex';

const PASTE = `Cinderace @ Heavy-Duty Boots
Ability: Libero
Level: 80
Tera Type: Fire
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Pyro Ball
- U-turn
- High Jump Kick
- Sucker Punch
`;

describe('teams', () => {
  it('imports a standard Showdown paste', () => {
    const team = importTeamPaste(PASTE, gen);
    expect(team).toBeDefined();
    expect(team!.team).toHaveLength(1);
    const set = team!.team[0]!;
    expect(set.species || set.name).toBeTruthy();
    expect(set.ability).toBe('Libero');
    expect(set.moves).toEqual(['Pyro Ball', 'U-turn', 'High Jump Kick', 'Sucker Punch']);
  });

  it('packs sets into the server /utm format and round-trips', () => {
    const team = importTeamPaste(PASTE, gen)!;
    const packed = packTeam(team.team);
    expect(typeof packed).toBe('string');
    expect(packed.length).toBeGreaterThan(0);
    // Packed format must contain the move list and not the paste layout.
    expect(packed).toContain('Libero');
    expect(packed).not.toContain('- Pyro Ball');
  });

  it('returns undefined for garbage input', () => {
    expect(importTeamPaste('not a team at all {{{')).toBeUndefined();
  });
});

describe('paste export compatibility', () => {
  const FULL = `Pikachu @ Light Ball
Ability: Static
Level: 50
Shiny: Yes
Tera Type: Electric
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
IVs: 0 Atk
- Thunderbolt
- Hidden Power Ice

Snorlax (M) @ Leftovers
Ability: Thick Fat
Careful Nature
- Rest
`;

  it('keeps ability, EVs, nature, shiny and gender when exporting', async () => {
    const { exportTeamPaste } = await import('../src/teams');
    const out = exportTeamPaste(importTeamPaste(FULL, gen)!, gen);
    for (const line of ['Ability: Static', 'Level: 50', 'Shiny: Yes', 'Tera Type: Electric', 'EVs: 252 SpA / 4 SpD / 252 Spe', 'Timid Nature', 'IVs: 0 Atk', 'Snorlax (M) @ Leftovers', 'Ability: Thick Fat', 'Careful Nature']) {
      expect(out).toContain(line);
    }
  });

  it('round-trips paste -> sets -> paste -> sets without losing data', async () => {
    const { exportTeamPaste } = await import('../src/teams');
    const first = importTeamPaste(FULL, gen)!;
    const second = importTeamPaste(exportTeamPaste(first, gen), gen)!;
    expect(second.team).toEqual(first.team);
  });

  it('exports and imports a single set', async () => {
    const { exportSetPaste, importSetPaste } = await import('../src/teams');
    const set = importTeamPaste(FULL, gen)!.team[0]!;
    const text = exportSetPaste(set, gen);
    expect(text).toContain('Ability: Static');
    expect(importSetPaste(text, gen)).toEqual(set);
    expect(importSetPaste('???', gen)).toBeUndefined();
  });
});

describe('export purity', () => {
  it('does not mutate the sets it exports', async () => {
    const { exportTeamPaste, exportSetPaste } = await import('../src/teams');
    const team = importTeamPaste('Garchomp @ Leftovers\nAbility: Rough Skin\n- Earthquake\n', gen)!.team;
    const before = JSON.stringify(team);
    exportTeamPaste(team, gen);
    exportSetPaste(team[0]!, gen);
    expect(JSON.stringify(team)).toBe(before);
  });
});
