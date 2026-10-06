import { describe, it, expect } from 'vitest';
import { PSClient } from '../src/client';
import { BattleRoom } from '../src/rooms';

// Avoids a hard @types/node dependency just for the LIVE gate.
declare const process: { env: Record<string, string | undefined> };

/**
 * Live end-to-end smoke test against the official Showdown server.
 * Not part of the default run: LIVE=1 npx vitest run test/live.smoke.test.ts
 */

const LIVE = process.env.LIVE === '1';

async function waitFor(cond: () => boolean, timeoutMs: number, what: string): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for: ${what}`);
    await new Promise((r) => setTimeout(r, 150));
  }
}

describe.skipIf(!LIVE)('live official-server smoke test', () => {
  it('connects, logs in as guest, plays into a random battle, and parses real requests', async () => {
    const client = new PSClient();
    let battleRoomId: string | null = null;
    client.events.on('room', (room) => {
      if (room instanceof BattleRoom) battleRoomId = room.id;
    });
    client.events.on('error', ({ message }) => console.error('client error:', message));

    client.connect();
    await waitFor(() => client.challstr !== '', 20000, 'challstr');

    const guest = `StellarTest${Math.floor(10000 + Math.random() * 89999)}`;
    client.loginGuest(guest);
    await waitFor(() => client.user?.named === true, 20000, 'named login');
    console.log('logged in as:', client.user!.name);

    client.searchBattles('gen9randombattle');
    await waitFor(() => battleRoomId !== null, 120000, 'battle found');
    const roomid = battleRoomId as unknown as string;
    console.log('battle room:', roomid);

    const room = client.getRoom<BattleRoom>(roomid)!;
    await waitFor(() => !!room.request, 30000, 'first request');
    const req = room.request!;
    console.log('first requestType:', req.requestType, 'ourSide:', room.ourSide);
    expect(['p1', 'p2']).toContain(room.ourSide);

    if (req.requestType === 'team') {
      const n = req.side?.pokemon.length ?? 6;
      client.choose(roomid, `team ${Array.from({ length: n }, (_, i) => i + 1).join(',')}`);
    }

    await waitFor(
      () => room.request?.requestType === 'move' || (room.battle?.turn ?? 0) > 0,
      30000,
      'turn 1 / move request',
    );
    console.log('battle turn:', room.battle?.turn);

    const moveReq = room.request;
    if (moveReq?.requestType === 'move') {
      const moves = moveReq.active?.[0]?.moves ?? [];
      console.log('move request payload:', JSON.stringify(moves[0]));
      expect(moves.length).toBeGreaterThan(0);
      // Legacy `move` key must be what the live server sends.
      expect(typeof (moves[0] as unknown as { move?: string }).move).toBe('string');
    }

    const myActive = room.mySide?.active[0];
    const foeActive = room.foeSide?.active[0];
    console.log('field:', myActive?.name, 'vs', foeActive?.name);
    expect(myActive).toBeTruthy();
    expect(foeActive).toBeTruthy();

    client.forfeit(roomid);
    await waitFor(() => room.winner !== null || room.tied, 20000, 'battle end');
    console.log('battle ended. winner:', room.winner, 'tied:', room.tied);
    client.disconnect();
  }, 240000);
});
