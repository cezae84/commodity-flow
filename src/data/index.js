/**
 * The dataset as the app sees it. Everything editorial comes from the CSV files
 * in data/ — edit those, not this file. Vite inlines the files at build time
 * (`?raw`), so the standalone single-file build still works offline.
 */
import sources from '../../data/sources.csv?raw';
import facts from '../../data/facts.csv?raw';
import routes from '../../data/routes.csv?raw';
import chokepoints from '../../data/chokepoints.csv?raw';
import pipelines from '../../data/pipelines.csv?raw';
import { buildDataset } from './dataset.js';

export const RAW_CSV = { sources, facts, routes, chokepoints, pipelines };

const data = buildDataset(RAW_CSV);

if (import.meta.env.DEV && data.issues.length) {
  console.warn(`Dataset issues (run npm run check:data):\n${data.issues.join('\n')}`);
}

export const {
  SOURCES,
  SOURCE_BY_ID,
  FACTS,
  FACT_BY_ID,
  ROUTES,
  ROUTE_BY_ID,
  CHOKEPOINTS,
  CHOKEPOINT_BY_ID,
  PIPELINES,
} = data;
