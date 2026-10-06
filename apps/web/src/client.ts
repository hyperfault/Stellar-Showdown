import { PSClient } from '@stellar/core';

// Dev: same-origin proxy (see vite.config.ts) to dodge missing CORS headers.
// Prod fallback: direct URL (works in the desktop shell; web hosting should
// set VITE_LOGIN_SERVER_URL to its proxy path).
const loginServerUrl =
  import.meta.env.VITE_LOGIN_SERVER_URL ??
  (import.meta.env.DEV ? '/ps-api' : 'https://play.pokemonshowdown.com');

/** App-wide client singleton. */
export const client = new PSClient({ loginServerUrl });
