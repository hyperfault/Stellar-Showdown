import { useState } from 'react';
import { ChatRoom } from '@stellar/core';
import { client } from '../client';
import { useAppStore } from '../store';

export default function ChatScreen({ roomid }: { roomid: string }) {
  useAppStore((s) => s.tick);
  const [text, setText] = useState('');
  const room = client.getRoom<ChatRoom>(roomid);

  if (!(room instanceof ChatRoom)) return <div className="card panel">Chat room not found.</div>;

  const scrollRef = (el: HTMLDivElement | null) => {
    if (el) el.scrollTop = el.scrollHeight;
  };

  return (
    <div className="chat-root">
      <div className="col grow" style={{ minHeight: 0 }}>
        <h2 style={{ margin: 0 }}>#{room.title || room.id}</h2>
        <div className="chat-messages card" ref={scrollRef}>
          {room.messages.map((m, i) =>
            m.kind === 'chat' ? (
              <div key={i}>
                <span className="name">{m.user}</span>: {m.text}
              </div>
            ) : (
              <div key={i} className="system">
                {m.text}
              </div>
            ),
          )}
        </div>
        <div className="brow">
          <input
            className="grow"
            placeholder={`Message #${room.id}…`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && text.trim()) {
                client.sendChat(roomid, text.trim());
                setText('');
              }
            }}
          />
        </div>
      </div>
      <div className="chat-users card">
        <h3>{room.users.length} users</h3>
        {room.users.map((u, i) => (
          <div key={`${u.name}-${i}`} className="u">
            <span className="dim">{u.rank.trim()}</span> {u.name}
          </div>
        ))}
      </div>
    </div>
  );
}
