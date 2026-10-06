import { describe, it, expect } from 'vitest';
import { BattleRoom } from '../src/rooms';
import { gens } from '../src/dex';
import { toID } from '@pkmn/data';

/**
 * Engine replay verification: feed a realistic gen9 random-battle protocol
 * log (legacy request format, exactly as the live server sends it) through
 * BattleRoom and assert the tracked state matches ground truth.
 */

const TEAM_PREVIEW_REQUEST = JSON.stringify({
  teamPreview: true,
  rqid: 1,
  maxTeamSize: 6,
  side: {
    name: 'Stellar Tester',
    id: 'p1',
    pokemon: [
      {
        ident: 'p1: Cinderace', details: 'Cinderace, L80, M', condition: '341/341', active: true,
        stats: { atk: 239, def: 187, spa: 161, spd: 187, spe: 261 },
        moves: ['pyroball', 'uturn', 'highjumpkick', 'suckerpunch'],
        baseAbility: 'blaze', item: 'heavydutyboots', pokeball: 'pokeball', ability: 'blaze',
      },
      {
        ident: 'p1: Gholdengo', details: 'Gholdengo, L84', condition: '100/100', active: false,
        stats: { atk: 152, def: 216, spa: 297, spd: 211, spe: 195 },
        moves: ['makeitrain', 'shadowball', 'nastyplot', 'recover'],
        baseAbility: 'goodasgold', item: 'choicescarf', pokeball: 'pokeball', ability: 'goodasgold',
      },
    ],
  },
});

const MOVE_REQUEST = JSON.stringify({
  rqid: 2,
  side: {
    name: 'Stellar Tester',
    id: 'p1',
    pokemon: [
      {
        ident: 'p1: Cinderace', details: 'Cinderace, L80, M', condition: '181/341', active: true,
        stats: { atk: 239, def: 187, spa: 161, spd: 187, spe: 261 },
        moves: ['pyroball', 'uturn', 'highjumpkick', 'suckerpunch'],
        baseAbility: 'blaze', item: 'heavydutyboots', pokeball: 'pokeball', ability: 'blaze',
      },
      {
        ident: 'p1: Gholdengo', details: 'Gholdengo, L84', condition: '100/100', active: false,
        stats: { atk: 152, def: 216, spa: 297, spd: 211, spe: 195 },
        moves: ['makeitrain', 'shadowball', 'nastyplot', 'recover'],
        baseAbility: 'goodasgold', item: 'choicescarf', pokeball: 'pokeball', ability: 'goodasgold',
      },
    ],
  },
  active: [
    {
      moves: [
        { move: 'Pyro Ball', id: 'pyroball', pp: 8, maxpp: 8, target: 'normal', disabled: false },
        { move: 'U-turn', id: 'uturn', pp: 32, maxpp: 32, target: 'normal', disabled: false },
        { move: 'High Jump Kick', id: 'highjumpkick', pp: 16, maxpp: 16, target: 'normal', disabled: false },
        { move: 'Sucker Punch', id: 'suckerpunch', pp: 8, maxpp: 8, target: 'normal', disabled: false },
      ],
      trapped: false,
    },
  ],
  noCancel: true,
});

const HEADER = [
  '|init|battle',
  '|title|Stellar Tester vs. Ladder Foe',
  '|player|p1|Stellar Tester|265|',
  '|player|p2|Ladder Foe|167|',
  '|teamsize|p1|6',
  '|teamsize|p2|6',
  '|gametype|singles',
  '|gen|9',
  '|tier|[Gen 9] Random Battle',
  '|rated|',
  '|clearpoke',
  '|poke|p1|Cinderace, L80, M|',
  '|poke|p1|Gholdengo, L84|',
  '|poke|p2|Dragapult, L82, M|',
  '|poke|p2|Kingambit, L82, M|',
  '|teampreview',
];

const TURN_ONE = [
  '|start',
  '|turn|1',
  '|switch|p1a: Cinderace|Cinderace, L80, M|341/341',
  '|switch|p2a: Dragapult|Dragapult, L82, M|100/100',
  '|move|p2a: Dragapult|Dragon Darts|p1a: Cinderace',
  '|-damage|p1a: Cinderace|261/341',
  '|-damage|p1a: Cinderace|181/341',
  '|move|p1a: Cinderace|Sucker Punch|p2a: Dragapult',
  '|-supereffective|p2a: Dragapult',
  '|-damage|p2a: Dragapult|0 fnt',
  '|faint|p2a: Dragapult',
  '|upkeep',
];

const TURN_TWO = [
  '|turn|2',
  '|switch|p2a: Kingambit|Kingambit, L82, M|100/100',
  '|move|p1a: Cinderace|Pyro Ball|p2a: Kingambit',
  '|-supereffective|p2a: Kingambit',
  '|-damage|p2a: Kingambit|0 fnt',
  '|faint|p2a: Kingambit',
  '|win|Stellar Tester',
];

function feed(room: BattleRoom, lines: string[]): void {
  for (const line of lines) room.addLine(line);
}

describe('battle engine replay', () => {
  it('tracks header, side detection, and team preview request', () => {
    const room = new BattleRoom('battle-gen9randombattle-1', gens, toID('Stellar Tester'));
    feed(room, HEADER);
    room.addLine(`|request|${TEAM_PREVIEW_REQUEST}`);

    expect(room.ourSide).toBe('p1');
    expect(room.title).toBe('Stellar Tester vs. Ladder Foe');
    expect(room.battle).not.toBeNull();
    expect(room.battle!.tier).toBe('[Gen 9] Random Battle');
    expect(room.battle!.gen.num).toBe(9);
    expect(room.battle!.rated).toBeTruthy();

    const request = room.request!;
    expect(request.rqid).toBe(1);
    expect(request.requestType).toBe('team');
    expect(request.side?.pokemon).toHaveLength(2);
  });

  it('mirrors turn-1 damage, KO, and the next move request', () => {
    const room = new BattleRoom('battle-gen9randombattle-1', gens, toID('Stellar Tester'));
    feed(room, HEADER);
    room.addLine(`|request|${TEAM_PREVIEW_REQUEST}`);
    feed(room, TURN_ONE);
    room.addLine(`|request|${MOVE_REQUEST}`);

    const battle = room.battle!;
    expect(battle.turn).toBe(1);

    const mine = battle.p1.active[0]!;
    expect(mine.name).toBe('Cinderace');
    expect(mine.hp).toBe(181);
    expect(mine.maxhp).toBe(341);
    expect(mine.fainted).toBe(false);

    const foe = battle.p2.team.find((p) => p.name === 'Dragapult')!;
    expect(foe.fainted).toBe(true);
    expect(foe.hp).toBe(0);

    const request = room.request!;
    expect(request.rqid).toBe(2);
    expect(request.requestType).toBe('move');
    if (request.requestType !== 'move') throw new Error('expected a move request');
    const active = request.active![0]!;
    expect(active.moves).toHaveLength(4);
    // The live server uses the legacy `move` key — assert our understanding.
    expect((active.moves[0] as unknown as { move: string }).move).toBe('Pyro Ball');
    expect(active.trapped).toBe(false);
  });

  it('tracks the second turn, foe switch-in, and the winner', () => {
    const room = new BattleRoom('battle-gen9randombattle-1', gens, toID('Stellar Tester'));
    feed(room, HEADER);
    room.addLine(`|request|${TEAM_PREVIEW_REQUEST}`);
    feed(room, TURN_ONE);
    room.addLine(`|request|${MOVE_REQUEST}`);
    feed(room, TURN_TWO);

    const battle = room.battle!;
    expect(battle.turn).toBe(2);
    const kingambit = battle.p2.team.find((p) => p.name === 'Kingambit')!;
    expect(kingambit.fainted).toBe(true);
    expect(kingambit.hp).toBe(0);
    expect(room.winner).toBe('Stellar Tester');
    expect(battle.p1.active[0]!.hp).toBe(181);
  });

  it('keeps raw lines for the battle log', () => {
    const room = new BattleRoom('battle-gen9randombattle-1', gens, toID('Stellar Tester'));
    feed(room, [...HEADER, ...TURN_ONE]);
    expect(room.log.some((l) => l.startsWith('|turn|1'))).toBe(true);
    expect(room.log.some((l) => l.startsWith('|move|'))).toBe(true);
    // Room-level lines (title) are not part of the battle log.
    expect(room.log.some((l) => l.startsWith('|title|'))).toBe(false);
  });
});
