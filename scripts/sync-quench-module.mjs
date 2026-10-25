import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_DIR } from './lib/fvtt-config.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SOURCE = path.join(ROOT, 'tests', 'quench');
const TARGET = path.join(DATA_DIR, 'modules', 'blades68-quench-tests');


await rm(TARGET, { recursive: true, force: true });
await mkdir(TARGET, { recursive: true });
await cp(SOURCE, TARGET, { recursive: true, force: true });

console.log(`Quench test module deployed to ${TARGET}`);
