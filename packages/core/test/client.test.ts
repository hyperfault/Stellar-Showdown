import { describe, it, expect } from 'vitest';
import { PSClient } from '../src/client';
import type { Transport, TransportFactory, TransportHandlers } from '../src/connection';
import { BattleRoom, ChatRoom } from '../src/rooms';

/** A transport we drive manually: server frames go in via receive(). */
function fakeTransport(): { factory: TransportFactory; api: { receive: (frame: string) => void; sent: string[] } } {
  let handlers: TransportHandlers | null = null;
  const sent: string[] = [];
  const factory = (_url: string, h: TransportHandlers): Transport => {
    handlers = h;
    queueMicrotask(() => h.onOpen());
    return {
      send(data: string) {
        sent.push(data);
      },
      close() {},
    };
  };
  return {
    factory,
    api: {
      sent,
      receive(frame: string) {
        if (!handlers) throw new Error('transport not connected');
        handlers.onMessage(frame);
      },
    },
  };
}

describe('PSClient global + room routing', () => {
  it('handles challstr, updateuser, formats, and challenges', () => {
    const { factory, api } = fakeTransport();
    const client = new PSClient({ transport: factory });
    client.connect();

    api.receive('|challstr|4|abc123def');
    expect(client.challstr).toBe('4|abc123def');

    api.receive('|updateuser|Stellar Tester|1|265|{}');
    expect(client.user?.userid).toBe('stellartester');
    expect(client.user?.named).toBe(true);

    api.receive('|formats|,LL|,1|S/V Singles|[Gen 9] Random Battle,f|[Gen 9] OU,e');
    expect(client.formats.map((f) => f.name)).toEqual(['[Gen 9] Random Battle', '[Gen 9] OU']);
    expect(client.formats[0]!.isRandomFormat).toBe(true);
    expect(client.formats[1]!.isRandomFormat).toBe(false);

    api.receive('|updatechallenges|{"challengesFrom":{"ladderfoe":"[Gen 9] OU"},"challenging":{}}');
    expect(client.challenges.challengesFrom['ladderfoe']).toBe('[Gen 9] OU');

    api.receive('|updatesearch|{"searching":["gen9randombattle"],"games":null}');
    expect(client.searchState.searching).toEqual(['gen9randombattle']);
  });

  it('creates chat and battle rooms from room frames and routes lines', () => {
    const { factory, api } = fakeTransport();
    const client = new PSClient({ transport: factory });
    client.connect();
    api.receive('|updateuser|Stellar Tester|1|265|{}');

    api.receive('>lobby\n|init|chat\n|title|Lobby\n|users|2, Stellar Tester,+Ladder Foe');
    const lobby = client.getRoom('lobby');
    expect(lobby).toBeInstanceOf(ChatRoom);
    api.receive('>lobby\n|c:|1700000000|Ladder Foe|hello there');
    expect((lobby as ChatRoom).messages.at(-1)?.text).toBe('hello there');
    expect((lobby as ChatRoom).users).toHaveLength(2);

    api.receive(
      '>battle-gen9randombattle-42\n|init|battle\n|title|Stellar Tester vs. Ladder Foe\n|player|p1|Stellar Tester|265|\n|player|p2|Ladder Foe|167|\n|gametype|singles\n|gen|9\n|tier|[Gen 9] Random Battle',
    );
    const battle = client.getRoom('battle-gen9randombattle-42');
    expect(battle).toBeInstanceOf(BattleRoom);
    expect((battle as BattleRoom).ourSide).toBe('p1');
    expect((battle as BattleRoom).battle!.tier).toBe('[Gen 9] Random Battle');
  });

  it('sends room-scoped choices and global matchmaking commands', () => {
    const { factory, api } = fakeTransport();
    const client = new PSClient({ transport: factory });
    client.connect();

    client.searchBattles('gen9randombattle');
    expect(api.sent).toContain('|/utm null');
    expect(api.sent).toContain('|/search gen9randombattle');

    client.choose('battle-x-1', 'move 2 terastallize');
    expect(api.sent).toContain('battle-x-1|/choose move 2 terastallize');

    client.undoChoice('battle-x-1');
    expect(api.sent).toContain('battle-x-1|/undo');

    client.challenge('ladderfoe', 'gen9randombattle');
    expect(api.sent).toContain('|/challenge ladderfoe, gen9randombattle');

    client.sendChat('lobby', 'hi everyone');
    expect(api.sent).toContain('lobby|hi everyone');
  });
});

describe('matchmaking with a team and the live format list', () => {
  const FORMATS = '|formats|,LL|,1|S/V Singles|[Gen 9] Random Battle,f|[Gen 9] OU,e|[Gen 9] Anything Goes,c|,2|S/V Doubles|[Gen 9] Doubles OU,e';

  it('keeps the Random Battle flow: no team upload, just null + search', () => {
    const { factory, api } = fakeTransport();
    const client = new PSClient({ transport: factory });
    client.connect();
    api.receive(FORMATS);
    const rb = client.formats.find((f) => f.id === 'gen9randombattle')!;
    expect(rb.isRandomFormat).toBe(true);
    client.searchBattles(rb.id);
    expect(api.sent).toContain('|/utm null');
    expect(api.sent).toContain('|/search gen9randombattle');
  });

  it('uploads the packed team before searching a bring-your-own-team format', async () => {
    const { Sets } = await import('@pkmn/sets');
    const { importTeamPaste, packTeam } = await import('../src/teams');
    const { gen } = await import('../src/dex');
    const { factory, api } = fakeTransport();
    const client = new PSClient({ transport: factory });
    client.connect();
    api.receive(FORMATS);
    const ou = client.formats.find((f) => f.id === 'gen9ou')!;
    expect(ou).toMatchObject({ needsTeam: true, searchShow: true, teamFormat: 'gen9ou' });
    expect(client.formats.find((f) => f.id === 'gen9anythinggoes')!.searchShow).toBe(false);

    const sets = importTeamPaste('Garchomp @ Rocky Helmet\nAbility: Rough Skin\nEVs: 252 HP / 252 Def / 4 SpD\nImpish Nature\n- Earthquake\n- Stealth Rock\n', gen)!.team;
    client.searchBattles(ou.id, sets);
    const utm = api.sent.find((s) => s.startsWith('|/utm '))!;
    expect(utm).not.toBe('|/utm null');
    expect(Sets.unpack(utm.slice('|/utm '.length).split(']')[0]!, gen.dex as never)).toMatchObject({ species: 'Garchomp', item: 'Rocky Helmet', ability: 'Rough Skin', nature: 'Impish' });
    expect(api.sent.indexOf(utm)).toBeLessThan(api.sent.indexOf('|/search gen9ou'));
    expect(utm).toBe(`|/utm ${packTeam(sets)}`);
  });
});
