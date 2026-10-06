import { useEffect, type ReactNode } from 'react';
import { BattleRoom, ChatRoom } from '@stellar/core';
import { client } from './client';
import { useAppStore } from './store';
import { ServiceProvider } from './services/context';
import { createShowdownService, toPlayerProfile } from './services/showdown';
import { AppShell, type ScreenId } from './components/AppShell';
import { RoomNav } from './components/RoomNav';
import { ChallengeDock } from './components/ChallengeDock';
import { SearchPill } from './components/SearchPill';
import { HomeScreen } from './screens/HomeScreen';
import { LoginScreen } from './screens/LoginScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen';
import BattleScreen from './screens/BattleScreen';
import ChatScreen from './screens/ChatScreen';

/** UI service adapter over the existing client — created once. */
const service = createShowdownService(client);

export default function App() {
  const { connected, user, view, setView, toast, dismissToast, searchState, challenges } = useAppStore();

  useEffect(() => {
    client.connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rooms = [...client.rooms.values()];
  const searching = searchState.searching.length > 0;
  const loggedIn = !!user?.named;
  const profile = toPlayerProfile(user);
  const logout = () => client.logout();

  const navigate = (screen: ScreenId) => setView({ kind: 'screen', screen });
  const openRoom = (roomid: string) => setView({ kind: 'room', roomid });

  const onPlay = (formatId: string) => {
    if (searching) client.cancelSearch();
    else client.searchBattles(formatId); // Random Battle: no team upload needed
  };

  const roomsNav = (
    <RoomNav
      rooms={rooms}
      activeRoomId={view.kind === 'room' ? view.roomid : undefined}
      canJoin={loggedIn}
      onOpen={openRoom}
      onClose={(roomid) => client.leave(roomid)}
      onJoin={(roomid) => { client.join(roomid); openRoom(roomid); }}
    />
  );

  const conn = (
    <span className={`conn${connected ? ' conn--on' : ''}`} title={connected ? 'Connected' : 'Connecting'}>
      <i className="conn__dot" />{connected ? 'Online' : 'Connecting…'}
    </span>
  );

  let content: ReactNode;
  if (view.kind === 'room') {
    const room = client.getRoom(view.roomid);
    content = (
      <AppShell active="play" onNavigate={navigate} profile={profile} onLogout={logout}
        rooms={roomsNav} topbarExtra={conn} roomMode>
        {room instanceof BattleRoom ? (
          <BattleScreen roomid={view.roomid} />
        ) : room instanceof ChatRoom ? (
          <ChatScreen roomid={view.roomid} />
        ) : (
          <div className="card panel">Room not found — it may have closed.</div>
        )}
      </AppShell>
    );
  } else if (view.screen === 'play') {
    content = loggedIn ? (
      <HomeScreen
        onPlay={onPlay}
        onNavigate={navigate}
        onLogout={logout}
        searching={searching}
        rooms={roomsNav}
        topbarExtra={conn}
      >
        <ChallengeDock challenges={challenges} />
      </HomeScreen>
    ) : (
      <AppShell active="play" onNavigate={navigate} rooms={roomsNav} topbarExtra={conn}>
        <LoginScreen connected={connected} />
      </AppShell>
    );
  } else {
    content = (
      <AppShell active={view.screen} onNavigate={navigate} profile={profile}
        onLogout={loggedIn ? logout : undefined} rooms={roomsNav} topbarExtra={conn}>
        <PlaceholderScreen id={view.screen} onBack={() => navigate('play')} />
      </AppShell>
    );
  }

  return (
    <ServiceProvider service={service}>
      {content}
      {searching && <SearchPill formats={searchState.searching} onCancel={() => client.cancelSearch()} />}
      {toast && <div className="toast" onClick={dismissToast}>{toast}</div>}
    </ServiceProvider>
  );
}
