import { useState } from 'react';
import type { ChallengeState } from '@stellar/core';
import { client } from '../client';
import { RANDOM_BATTLE_ID } from '../services/showdown';

/** Direct challenges — kept from the previous home screen, restyled to the new design. */
export function ChallengeDock({ challenges }: { challenges: ChallengeState }) {
  const [target, setTarget] = useState('');
  const outgoing = Object.entries(challenges.challenging);
  const incoming = Object.entries(challenges.challengesFrom);

  const challenge = () => {
    const name = target.trim();
    if (!name) return;
    client.challenge(name, RANDOM_BATTLE_ID);
    setTarget('');
  };

  return (
    <section className="col dock" aria-labelledby="dock-title">
      <h2 className="col__title" id="dock-title">Challenges</h2>
      <div className="card dock__card">
        <div className="dock__row">
          <input
            placeholder="Challenge a player — enter their username"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && challenge()}
          />
          <button className="btn btn--primary dock__btn" disabled={!target.trim()} onClick={challenge}>
            Challenge
          </button>
        </div>
        {outgoing.map(([uid, fmt]) => (
          <div key={uid} className="dock__row dock__note">
            <span>Waiting for <b>{uid}</b> ({fmt})…</span>
            <button className="btn btn--ghost" onClick={() => client.cancelChallenge(uid)}>Cancel</button>
          </div>
        ))}
        {incoming.map(([uid, fmt]) => (
          <div key={uid} className="dock__row dock__note">
            <span><b>{uid}</b> wants to battle ({fmt})</span>
            <span className="dock__actions">
              <button className="btn btn--primary dock__btn" onClick={() => client.acceptChallenge(uid)}>Accept</button>
              <button className="btn btn--ghost" onClick={() => client.rejectChallenge(uid)}>Decline</button>
            </span>
          </div>
        ))}
        {outgoing.length === 0 && incoming.length === 0 && (
          <p className="dock__hint">Direct challenges are Random Battle for now — ladder matchmaking is up top.</p>
        )}
      </div>
    </section>
  );
}
