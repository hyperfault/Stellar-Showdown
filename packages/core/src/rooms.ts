import { Battle } from '@pkmn/client';
import { toID, type Generations, type ID, type SideID } from '@pkmn/data';
import type { Request } from '@pkmn/protocol';

export type RoomType = 'chat' | 'battle' | 'html' | 'unknown';

export interface ChatMessage {
  kind: 'chat' | 'system' | 'html';
  user?: string;
  rank?: string;
  text: string;
  time?: number;
}

export interface RoomUser {
  rank: string;
  name: string;
  away?: boolean;
}

/** Base room; `version` bumps on every mutation so UIs can re-render cheaply. */
export class Room {
  type: RoomType = 'unknown';
  title = '';
  version = 0;

  constructor(public readonly id: string) {}

  protected touch(): void {
    this.version++;
  }
}

/** Split a `|users|` payload: first segment is the count, rest are `rankname`. */
function parseUserList(payload: string): RoomUser[] {
  const segments = payload.split(',');
  return segments.slice(1).map((entry) => {
    const rank = entry.charAt(0);
    const name = entry.slice(1).trim();
    return { rank, name };
  });
}

export class ChatRoom extends Room {
  override type: RoomType = 'chat';
  users: RoomUser[] = [];
  messages: ChatMessage[] = [];
  /** Cap so long sessions don't grow memory unbounded. */
  maxMessages = 500;

  addLine(line: string): void {
    const parts = line.split('|');
    const msgType = parts[1] ?? '';
    switch (msgType) {
      case 'users':
        this.users = parseUserList(parts.slice(2).join('|'));
        break;
      case 'join':
      case 'j':
        this.users.push({ rank: (parts[2] ?? ' ').charAt(0), name: (parts[2] ?? '').slice(1) });
        this.pushSystem(`${(parts[2] ?? '').slice(1)} joined`);
        break;
      case 'leave':
      case 'l': {
        const name = (parts[2] ?? '').slice(1);
        this.users = this.users.filter((u) => toID(u.name) !== toID(name));
        this.pushSystem(`${name} left`);
        break;
      }
      case 'name':
      case 'n': {
        const name = (parts[2] ?? '').slice(1);
        const oldId = parts[3] ?? '';
        this.users = this.users.filter((u) => toID(u.name) !== toID(oldId));
        this.users.push({ rank: name.charAt(0), name: name.slice(1) });
        break;
      }
      case 'c:':
        this.push({ kind: 'chat', time: Number(parts[2]), user: parts[3], text: parts.slice(4).join('|') });
        break;
      case 'c':
        this.push({ kind: 'chat', user: parts[2], text: parts.slice(3).join('|') });
        break;
      case 'html':
      case 'raw':
        this.push({ kind: 'html', text: parts.slice(2).join('|') });
        break;
      case '': {
        const text = parts.slice(2).join('|').trim();
        if (text) this.push({ kind: 'system', text });
        break;
      }
      default:
        break; // tournament/uhtml/etc. — later milestones
    }
    this.touch();
  }

  private pushSystem(text: string): void {
    this.push({ kind: 'system', text });
  }

  private push(msg: ChatMessage): void {
    this.messages.push(msg);
    if (this.messages.length > this.maxMessages) this.messages.splice(0, this.messages.length - this.maxMessages);
  }
}

/** Message types handled by the room itself rather than the battle engine. */
const ROOM_LEVEL_MESSAGES = new Set([
  'init', 'title', 'c', 'c:', 'chat', ':', 'html', 'raw', 'uhtml', 'uhtmlchange',
  'j', 'join', 'l', 'leave', 'n', 'name', 'deinit', 'noinit', 't:',
]);

export class BattleRoom extends Room {
  override type: RoomType = 'battle';
  battle: Battle | null = null;
  ourSide: SideID | null = null;
  winner: string | null = null;
  tied = false;
  chat: ChatMessage[] = [];
  /** Raw protocol lines, for the improved battle log view. */
  log: string[] = [];

  constructor(
    id: string,
    private readonly gens: Generations,
    private readonly playerUserid: ID | '',
  ) {
    super(id);
  }

  get request(): Request | undefined {
    return this.battle?.request;
  }

  get mySide() {
    if (!this.battle) return null;
    return this.ourSide === 'p2' ? this.battle.p2 : this.battle.p1;
  }

  get foeSide() {
    if (!this.battle) return null;
    return this.ourSide === 'p2' ? this.battle.p1 : this.battle.p2;
  }

  addLine(line: string): void {
    if (!line.startsWith('|')) return;
    const secondPipe = line.indexOf('|', 1);
    const msgType = line.slice(1, secondPipe === -1 ? undefined : secondPipe);

    if (msgType === 'title') {
      this.title = line.slice(secondPipe + 1);
      this.touch();
      return;
    }

    if (msgType === 'c:' || msgType === 'c') {
      const parts = line.split('|');
      const hasTime = msgType === 'c:';
      this.chat.push({
        kind: 'chat',
        time: hasTime ? Number(parts[2]) : undefined,
        user: parts[hasTime ? 3 : 2],
        text: parts.slice(hasTime ? 4 : 3).join('|'),
      });
      this.touch();
      return;
    }

    if (msgType === 'win') {
      this.winner = line.slice(secondPipe + 1);
    } else if (msgType === 'tie') {
      this.tied = true;
    }

    if (!ROOM_LEVEL_MESSAGES.has(msgType)) {
      this.log.push(line);
      if (!this.battle) {
        this.battle = new Battle(this.gens, this.playerUserid || null);
      }
      // Detect which side is ours as soon as the server introduces players.
      if (msgType === 'player' && !this.ourSide && this.playerUserid) {
        const parts = line.split('|');
        if (parts[3] && toID(parts[3]) === this.playerUserid) {
          this.ourSide = parts[2] as SideID;
        }
      }
      this.battle.add(line);
    }

    this.touch();
  }
}
