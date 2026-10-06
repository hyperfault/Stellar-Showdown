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
