import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Where the page reads live market prices (see src/data/live.js).
 * An explicit VITE_LIVE_DATA_URL wins; otherwise, when Netlify builds from a
 * linked GitHub repository, REPOSITORY_URL gives the owner and name, and the
 * prices live on that repository's `live-data` branch.
 */
function liveDataUrl(env) {
  if (env.VITE_LIVE_DATA_URL) return env.VITE_LIVE_DATA_URL;
  const repo = (process.env.REPOSITORY_URL ?? '').match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  return repo ? `https://raw.githubusercontent.com/${repo[1]}/${repo[2]}/live-data/prices.json` : '';
}

/** In `npm run dev`, serves .live/prices.json (written by `npm run prices`) at /live/prices.json. */
const localPrices = {
  name: 'local-prices',
  configureServer(server) {
    server.middlewares.use('/live/prices.json', (_req, res) => {
      const file = path.resolve('.live/prices.json');
      if (!fs.existsSync(file)) {
        res.statusCode = 404;
        res.end('Run `npm run prices` to fetch prices locally.');
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(fs.readFileSync(file));
    });
  },
};

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const standalone = mode === 'standalone';
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const liveUrl = liveDataUrl(env);

  // The single most likely way to ship a broken-looking public site: build
  // without the basemap key and get CARTO's watermark across every tile.
  if (command === 'build' && !liveUrl) {
    console.warn(
      '\n  ⚠  No live market data URL — the markets panel will stay hidden.\n' +
        '     Set VITE_LIVE_DATA_URL, or build on Netlify from the linked GitHub repository.\n'
    );
  }

  if (command === 'build' && !env.VITE_CARTO_KEY) {
    console.warn(
      '\n  ⚠  VITE_CARTO_KEY is not set — CARTO will watermark the basemap.\n' +
        '     Get a free key at https://carto.com/basemaps/apikey and put it in .env\n'
    );
  }

  return {
    plugins: [react(), localPrices],
    define: liveUrl ? { 'import.meta.env.VITE_LIVE_DATA_URL': JSON.stringify(liveUrl) } : {},
    build: standalone
      ? {
          outDir: 'dist-standalone',
          chunkSizeWarningLimit: 700,
          // Browsers refuse `<script type="module">` over file://, so the
          // bundle has to be a single classic script.
          rollupOptions: {
            output: {
              format: 'iife',
              inlineDynamicImports: true,
              entryFileNames: 'app.js',
              assetFileNames: 'app.[ext]',
            },
          },
          // The few images referenced by Leaflet's CSS become data: URIs, so no
          // absolute path survives in the output.
          assetsInlineLimit: 512 * 1024,
          cssCodeSplit: false,
          modulePreload: false,
        }
      : {
          // The dataset (CSV inlined as text) and Leaflet make one ~0.5 MB bundle by design.
          chunkSizeWarningLimit: 700,
        },
  };
});
