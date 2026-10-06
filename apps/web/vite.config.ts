import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // The Showdown login server sends no CORS headers, so browsers must go
      // through a same-origin proxy. Production hosting needs an equivalent
      // proxy rule (the desktop shell talks to the endpoint directly).
      '/ps-api': {
        target: 'https://play.pokemonshowdown.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ps-api/, ''),
      },
    },
  },
});
