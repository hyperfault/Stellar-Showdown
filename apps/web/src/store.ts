import { create } from 'zustand';
import type { ChallengeState, FormatEntry, SearchState, UserInfo } from '@stellar/core';
import { client } from './client';
import type { ScreenId } from './components/AppShell';

export type View = { kind: 'screen'; screen: ScreenId } | { kind: 'room'; roomid: string };

interface AppState {
  connected: boolean;
  user: UserInfo | null;
  formats: FormatEntry[];
  searchState: SearchState;
  challenges: ChallengeState;
  /** Bumped on every room mutation; cheap re-render signal. */
  tick: number;
  view: View;
  toast: string | null;
  setView: (view: View) => void;
  dismissToast: () => void;
}

export const useAppStore = create<AppState>()((set) => ({
  connected: false,
  user: null,
  formats: [],
  searchState: { searching: [], games: null },
  challenges: { challengesFrom: {}, challenging: {} },
  tick: 0,
  view: { kind: 'screen', screen: 'play' },
  toast: null,
  setView: (view) => set({ view }),
  dismissToast: () => set({ toast: null }),
}));

let toastTimer: ReturnType<typeof setTimeout> | undefined;
function showToast(message: string): void {
  useAppStore.setState({ toast: message });
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => useAppStore.setState({ toast: null }), 6000);
}

client.events.on('open', () => useAppStore.setState({ connected: true }));
client.events.on('close', () => useAppStore.setState({ connected: false }));
client.events.on('updateuser', (user) => useAppStore.setState({ user }));
client.events.on('formats', (formats) => useAppStore.setState({ formats }));
client.events.on('updatesearch', (searchState) => useAppStore.setState({ searchState }));
client.events.on('updatechallenges', (challenges) => useAppStore.setState({ challenges }));
client.events.on('error', ({ message }) => showToast(message));
client.events.on('popup', (message) => showToast(message.replace(/<[^>]*>/g, ' ').trim()));
client.events.on('room', (room) => {
  useAppStore.setState((s) => ({ tick: s.tick + 1 }));
  // Auto-focus battles; chat rooms stay in the nav until opened.
  if (room.type === 'battle') {
    useAppStore.setState({ view: { kind: 'room', roomid: room.id } });
  }
});
client.events.on('roomupdate', () => useAppStore.setState((s) => ({ tick: s.tick + 1 })));
client.events.on('roomleave', (roomid) =>
  useAppStore.setState((s) => ({
    tick: s.tick + 1,
    view: s.view.kind === 'room' && s.view.roomid === roomid ? { kind: 'screen', screen: 'play' } : s.view,
  })),
);
