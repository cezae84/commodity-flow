import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Where the page reads its automated files: market prices (src/data/live.js,
 * `live-data` branch) and the AI news brief (src/data/news.js, `live-news`
 * branch). An explicit VITE_LIVE_DATA_URL / VITE_NEWS_DATA_URL wins; otherwise,
 * when Netlify builds from a linked GitHub repository, REPOSITORY_URL gives the
 * owner and name.
 */
function liveUrl(explicit, branch, file) {
  if (explicit) return explicit;
  const repo = (process.env.REPOSITORY_URL ?? '').match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  return repo ? `https://raw.githubusercontent.com/${repo[1]}/${repo[2]}/${branch}/${file}` : '';
}

/**
 * In `npm run dev`, serves .live/prices.json (written by `npm run prices`) and
 * .live/news.json (`npm run news`, or `npm run news:demo` offline) under /live/.
 */
const localLiveFiles = {
  name: 'local-live-files',
  configureServer(server) {
    for (const [file, command] of [
      ['prices.json', 'npm run prices'],
      ['news.json', 'npm run news'],
    ]) {
      server.middlewares.use(`/live/${file}`, (_req, res) => {
        const local = path.resolve('.live', file);
        if (!fs.existsSync(local)) {
          res.statusCode = 404;
          res.end(`Run \`${command}\` to create ${file} locally.`);
          return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(fs.readFileSync(local));
      });
    }
  },
};

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const standalone = mode === 'standalone';
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const pricesUrl = liveUrl(env.VITE_LIVE_DATA_URL, 'live-data', 'prices.json');
  const newsUrl = liveUrl(env.VITE_NEWS_DATA_URL, 'live-news', 'news.json');

  // The single most likely way to ship a broken-looking public site: build
  // without the basemap key and get CARTO's watermark across every tile.
  if (command === 'build' && !pricesUrl) {
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
    plugins: [react(), localLiveFiles],
    define: {
      ...(pricesUrl && { 'import.meta.env.VITE_LIVE_DATA_URL': JSON.stringify(pricesUrl) }),
      ...(newsUrl && { 'import.meta.env.VITE_NEWS_DATA_URL': JSON.stringify(newsUrl) }),
    },
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
