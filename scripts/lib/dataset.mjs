/** Loads data/*.csv from disk for the node scripts. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDataset, CSV_FILES } from '../../src/data/dataset.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DATA_DIR = path.join(ROOT, 'data');

export const RAW_CSV = Object.fromEntries(
  CSV_FILES.map((name) => [name, fs.readFileSync(path.join(DATA_DIR, `${name}.csv`), 'utf8')])
);

export const dataset = buildDataset(RAW_CSV);
