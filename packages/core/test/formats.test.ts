import { describe, it, expect } from 'vitest';
import { parseFormatsList } from '../src/formats';

// Entries as they follow `|formats|` on the wire (split on '|').
const WIRE = ',LL|,1|S/V Singles|[Gen 9] Random Battle,f|[Gen 9] OU,e|[Gen 9] OU (Blitz),e|[Gen 9] Custom Game,1e|' +
  ',2|Other Metagames|[Gen 9] Battle Factory,f|[Gen 9] Anything Goes,c|[Gen 9] VGC 2025 Reg G,be|[Gen 9] Challenge Only,4|' +
  '|Legacy|[Gen 5] OU,e';

describe('parseFormatsList (official wire format)', () => {
  const list = parseFormatsList(WIRE.split('|'));
  const by = (id: string) => list.find((f) => f.id === id)!;

  it('reads sections and columns, skipping the local-ladder marker', () => {
    expect(list.map((f) => f.section)).toEqual([
      'S/V Singles', 'S/V Singles', 'S/V Singles', 'S/V Singles',
      'Other Metagames', 'Other Metagames', 'Other Metagames', 'Other Metagames', 'Legacy',
    ]);
    expect(by('gen9ou').column).toBe(1);
    expect(by('gen9battlefactory').column).toBe(2);
  });

  it('decodes the flag bits', () => {
    expect(by('gen9randombattle')).toMatchObject({ team: 'preset', isRandomFormat: true, needsTeam: false, searchShow: true, challengeShow: true });
    expect(by('gen9ou')).toMatchObject({ team: null, needsTeam: true, searchShow: true, challengeShow: true, tournamentShow: true });
    expect(by('gen9anythinggoes')).toMatchObject({ searchShow: false, challengeShow: true });
    expect(by('gen9challengeonly')).toMatchObject({ searchShow: false, challengeShow: true, tournamentShow: false });
    expect(by('gen9vgc2025regg').teambuilderLevel).toBe(50);
    expect(by('gen9battlefactory').isRandomFormat).toBe(true);
  });

  it('maps variants to their base team format', () => {
    expect(by('gen9oublitz').teamFormat).toBe('gen9ou');
    expect(by('gen9ou').teamFormat).toBe('gen9ou');
    expect(by('gen9customgame').teamFormat).toBe('gen9customgame');
    expect(by('gen5ou').gen).toBe(5);
  });
});
