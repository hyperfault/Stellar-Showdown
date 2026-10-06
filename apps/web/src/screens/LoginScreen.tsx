import { useState } from 'react';
import { client } from '../client';
import { PokemonArtwork } from '../components/PokemonSprite';

/** Login gate for the Play screen — guest or registered account, in the new design language. */
export function LoginScreen({ connected }: { connected: boolean }) {
  const [guestName, setGuestName] = useState('');
  const [regName, setRegName] = useState('');
  const [regPass, setRegPass] = useState('');
  const [showRegistered, setShowRegistered] = useState(false);

  const guest = () => guestName.trim() && client.loginGuest(guestName.trim());

  return (
    <>
      <div className="welcome">
        <h1>Stellar Showdown</h1>
        <p>A modern client for Pokémon Showdown — log in to start battling.</p>
      </div>
      <section className="quick login" aria-labelledby="login-title">
        <div>
          <h2 className="quick__title" id="login-title">Log in</h2>
          <p className="quick__sub">{connected ? 'Play as a guest or with your account' : 'Connecting to the server…'}</p>
        </div>
        <div className="login__form">
          <input
            className="login__input"
            placeholder="Username"
            value={guestName}
            autoComplete="username"
            onChange={(e) => setGuestName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && guest()}
          />
          <button className="btn btn--primary btn--lg login__go" disabled={!connected || !guestName.trim()} onClick={guest}>
            Play as guest
          </button>
          {showRegistered ? (
            <div className="login__registered">
              <input
                className="login__input"
                placeholder="Registered username"
                value={regName}
                autoComplete="username"
                onChange={(e) => setRegName(e.target.value)}
              />
              <input
                className="login__input"
                placeholder="Password"
                type="password"
                value={regPass}
                autoComplete="current-password"
                onChange={(e) => setRegPass(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && regName.trim() && regPass && client.loginRegistered(regName.trim(), regPass)}
              />
              <div className="login__row">
                <button
                  className="btn btn--primary login__go"
                  disabled={!connected || !regName.trim() || !regPass}
                  onClick={() => client.loginRegistered(regName.trim(), regPass)}
                >
                  Log in
                </button>
                <button className="btn btn--ghost" onClick={() => setShowRegistered(false)}>Back</button>
              </div>
            </div>
          ) : (
            <button className="btn btn--ghost" onClick={() => setShowRegistered(true)}>
              Have a registered account?
            </button>
          )}
        </div>
        <div className="hero-art" aria-hidden="true">
          <PokemonArtwork id="terapagos-stellar" />
        </div>
      </section>
    </>
  );
}
