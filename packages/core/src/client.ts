import { toID, type Generations, type ID } from '@pkmn/data';
import type { PokemonSet } from '@pkmn/types';
import { Emitter } from './emitter';
import { webSocketTransport, type Transport, type TransportFactory } from './connection';
import { fetchGuestAssertion, fetchRegisteredAssertion } from './auth';
import { ChatRoom, BattleRoom, Room } from './rooms';
import { gens as defaultGens } from './dex';
import { packTeam } from './teams';
import { parseFormatsList, type FormatEntry } from './formats';

export const DEFAULT_SERVER_URL = 'wss://sim3.psim.us/showdown/websocket';
export const DEFAULT_LOGIN_SERVER_URL = 'https://play.pokemonshowdown.com';

export interface PSClientOptions {
  serverUrl?: string;
  loginServerUrl?: string;
  transport?: TransportFactory;
  gens?: Generations;
}

export interface UserInfo {
  name: string;
  userid: ID;
  named: boolean;
  avatar: string;
}

export interface SearchState {
  searching: string[];
  games: Record<string, string> | null;
}

export interface ChallengeState {
  challengesFrom: Record<string, string>;
  challenging: Record<string, string>;
}

export interface ClientEvents extends Record<string, unknown> {
  open: void;
  close: { code: number; reason: string };
  updateuser: UserInfo;
  formats: FormatEntry[];
  updatesearch: SearchState;
  updatechallenges: ChallengeState;
  /** A room was created (|init| received). */
  room: Room;
  /** A room's state changed; re-render it. */
  roomupdate: Room;
  roomleave: string;
  pm: { from: string; to: string; text: string };
  popup: string;
  error: { roomid: string; message: string };
}

type PendingLogin =
  | { kind: 'guest'; name: string }
  | { kind: 'registered'; name: string; password: string };

/**
 * Stellar's Pokémon Showdown client core. Connects to the official server,
 * handles login, routes global + room messages, and owns battle engines.
 * UI-framework agnostic: subscribe to `events` and read public state.
 */
export class PSClient {
  readonly events = new Emitter<ClientEvents>();
  readonly gens: Generations;
  readonly serverUrl: string;
  readonly loginServerUrl: string;

  user: UserInfo | null = null;
  challstr = '';
  formats: FormatEntry[] = [];
  searchState: SearchState = { searching: [], games: null };
  challenges: ChallengeState = { challengesFrom: {}, challenging: {} };
  readonly rooms = new Map<string, Room>();

  private transport: Transport | null = null;
  private readonly transportFactory: TransportFactory;
  private pendingLogin: PendingLogin | null = null;

  constructor(options: PSClientOptions = {}) {
    this.serverUrl = options.serverUrl ?? DEFAULT_SERVER_URL;
    this.loginServerUrl = options.loginServerUrl ?? DEFAULT_LOGIN_SERVER_URL;
    this.transportFactory = options.transport ?? webSocketTransport;
    this.gens = options.gens ?? defaultGens;
  }

  get connected(): boolean {
    return this.transport !== null;
  }

  connect(): void {
    if (this.transport) return;
    this.transport = this.transportFactory(this.serverUrl, {
      onOpen: () => this.events.emit('open', undefined),
      onMessage: (data) => this.handleMessage(data),
      onClose: (code, reason) => {
        this.transport = null;
        this.challstr = '';
        this.events.emit('close', { code, reason });
      },
      onError: (err) => this.events.emit('error', { roomid: '', message: String(err) }),
    });
  }

  disconnect(): void {
    this.transport?.close();
    this.transport = null;
    this.challstr = '';
  }

  /** Send a protocol message. Room-scoped when `roomid` is given. */
  send(message: string, roomid = ''): void {
    this.transport?.send(`${roomid}|${message}`);
  }

  // ---- Auth ----

  loginGuest(name: string): void {
    this.pendingLogin = { kind: 'guest', name };
    void this.completeLogin();
  }

  loginRegistered(name: string, password: string): void {
    this.pendingLogin = { kind: 'registered', name, password };
    void this.completeLogin();
  }

  logout(): void {
    this.send('/logout');
    this.pendingLogin = null;
    this.user = null;
  }

  private async completeLogin(): Promise<void> {
    const pending = this.pendingLogin;
    if (!pending || !this.challstr) return;
    this.pendingLogin = null;
    try {
      if (pending.kind === 'guest') {
        const userid = toID(pending.name);
        const { assertion } = await fetchGuestAssertion(this.loginServerUrl, userid, this.challstr);
        this.send(`/trn ${pending.name},0,${assertion}`);
      } else {
        const { assertion, username } = await fetchRegisteredAssertion(
          this.loginServerUrl, pending.name, pending.password, this.challstr,
        );
        this.send(`/trn ${username ?? pending.name},0,${assertion}`);
      }
    } catch (err) {
      this.events.emit('error', {
        roomid: '',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ---- Rooms & chat ----

  join(roomid: string): void {
    this.send(`/join ${roomid}`);
  }

  leave(roomid: string): void {
    this.send(`/leave ${roomid}`, roomid);
  }

  sendChat(roomid: string, message: string): void {
    if (!message.trim()) return;
    this.send(message, roomid);
  }

  getRoom<T extends Room = Room>(roomid: string): T | undefined {
    return this.rooms.get(roomid) as T | undefined;
  }

  // ---- Matchmaking & challenges ----

  private setMatchmakingTeam(team?: ReadonlyArray<Partial<PokemonSet>>): void {
    // '/utm null' clears any previously uploaded team (needed for random formats).
    this.send(team && team.length > 0 ? `/utm ${packTeam(team)}` : '/utm null');
  }

  searchBattles(format: string, team?: ReadonlyArray<Partial<PokemonSet>>): void {
    this.setMatchmakingTeam(team);
    this.send(`/search ${format}`);
  }

  cancelSearch(): void {
    this.send('/cancelsearch');
  }

  challenge(userid: string, format: string, team?: ReadonlyArray<Partial<PokemonSet>>): void {
    this.setMatchmakingTeam(team);
    this.send(`/challenge ${userid}, ${format}`);
  }

  acceptChallenge(userid: string, team?: ReadonlyArray<Partial<PokemonSet>>): void {
    this.setMatchmakingTeam(team);
    this.send(`/accept ${userid}`);
  }

  rejectChallenge(userid: string): void {
    this.send(`/reject ${userid}`);
  }

  cancelChallenge(userid?: string): void {
    this.send(userid ? `/cancelchallenge ${userid}` : '/cancelchallenge');
  }

  // ---- Battle choices ----

  choose(roomid: string, choice: string): void {
    this.send(`/choose ${choice}`, roomid);
  }

  undoChoice(roomid: string): void {
    this.send('/undo', roomid);
  }

  forfeit(roomid: string): void {
    this.send('/forfeit', roomid);
  }

  startTimer(roomid: string): void {
    this.send('/timer on', roomid);
  }

  // ---- Message handling ----

  private handleMessage(data: string): void {
    let roomid = '';
    for (const line of data.split('\n')) {
      if (!line) continue;
      if (line.startsWith('>')) {
        roomid = line.slice(1);
        continue;
      }
      if (roomid) this.handleRoomLine(roomid, line);
      else this.handleGlobalLine(line);
    }
  }

  private handleGlobalLine(line: string): void {
    const parts = line.split('|');
    const type = parts[1] ?? '';
    const rest = () => parts.slice(2).join('|');
    switch (type) {
      case 'challstr':
        // The challstr itself contains a pipe ("4|key"), so rejoin everything.
        this.challstr = rest();
        void this.completeLogin();
        break;
      case 'updateuser': {
        const name = parts[2] ?? '';
        this.user = {
          name,
          userid: toID(name),
          named: parts[3] === '1',
          avatar: parts[4] ?? '',
        };
        this.events.emit('updateuser', this.user);
        break;
      }
      case 'formats':
        this.formats = parseFormatsList(parts.slice(2));
        this.events.emit('formats', this.formats);
        break;
      case 'updatesearch': {
        const json = JSON.parse(rest()) as { searching?: string[]; games?: Record<string, string> };
        this.searchState = { searching: json.searching ?? [], games: json.games ?? null };
        this.events.emit('updatesearch', this.searchState);
        break;
      }
      case 'updatechallenges': {
        const json = JSON.parse(rest()) as {
          challengesFrom?: Record<string, string>;
          challenging?: Record<string, string>;
        };
        this.challenges = {
          challengesFrom: json.challengesFrom ?? {},
          challenging: json.challenging ?? {},
        };
        this.events.emit('updatechallenges', this.challenges);
        break;
      }
      case 'pm':
        this.events.emit('pm', {
          from: parts[2] ?? '',
          to: parts[3] ?? '',
          text: parts.slice(4).join('|'),
        });
        break;
      case 'popup':
        this.events.emit('popup', rest());
        break;
      default:
        break; // queryresponse/tournament/etc. — later milestones
    }
  }

  private handleRoomLine(roomid: string, line: string): void {
    const parts = line.split('|');
    const type = parts[1] ?? '';

    if (type === 'init') {
      if (!this.rooms.has(roomid)) {
        const roomType = parts[2] ?? 'chat';
        const room: Room =
          roomType === 'battle'
            ? new BattleRoom(roomid, this.gens, this.user?.userid ?? '')
            : new ChatRoom(roomid);
        this.rooms.set(roomid, room);
        this.events.emit('room', room);
      }
      return;
    }

    if (type === 'deinit') {
      this.rooms.delete(roomid);
      this.events.emit('roomleave', roomid);
      return;
    }

    let room = this.rooms.get(roomid);
    if (!room) {
      // Lines can arrive for rooms we haven't seen |init| for yet.
      room = roomid.startsWith('battle-')
        ? new BattleRoom(roomid, this.gens, this.user?.userid ?? '')
        : new ChatRoom(roomid);
      this.rooms.set(roomid, room);
      this.events.emit('room', room);
    }

    if (room instanceof BattleRoom || room instanceof ChatRoom) {
      room.addLine(line);
    }
    this.events.emit('roomupdate', room);
  }
}
