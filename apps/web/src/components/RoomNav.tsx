import { BattleRoom, type Room } from '@stellar/core';
import { Icon } from './Icon';

interface Props {
  rooms: Room[];
  /** Currently focused room, if any. */
  activeRoomId?: string;
  canJoin: boolean;
  onOpen: (roomid: string) => void;
  onClose: (roomid: string) => void;
  onJoin: (roomid: string) => void;
}

function roomLabel(room: Room): string {
  if (room instanceof BattleRoom) {
    return room.title || room.id.replace('battle-', '').replace(/-\d+$/, '');
  }
  return `#${room.id}`;
}

/** Sidebar section listing open battle/chat rooms, plus quick-join for Lobby/Help. */
export function RoomNav({ rooms, activeRoomId, canJoin, onOpen, onClose, onJoin }: Props) {
  if (rooms.length === 0 && !canJoin) return null;
  return (
    <nav aria-label="Rooms">
      <h2 className="nav__label">Rooms</h2>
      <ul className="nav__group">
        {rooms.map((room) => (
          <li key={room.id} className="room-row">
            <button
              className="nav-btn room-row__btn"
              aria-current={activeRoomId === room.id ? 'page' : undefined}
              onClick={() => onOpen(room.id)}
            >
              <Icon name={room instanceof BattleRoom ? 'swords' : 'chat'} />
              <span className="room-row__name">{roomLabel(room)}</span>
            </button>
            <button className="room-row__close" aria-label={`Close ${roomLabel(room)}`} onClick={() => onClose(room.id)}>
              <Icon name="close" size={14} />
            </button>
          </li>
        ))}
        {canJoin && (
          <li className="room-join">
            <button className="btn btn--ghost" onClick={() => onJoin('lobby')}>Join Lobby</button>
            <button className="btn btn--ghost" onClick={() => onJoin('help')}>Join Help</button>
          </li>
        )}
      </ul>
    </nav>
  );
}
