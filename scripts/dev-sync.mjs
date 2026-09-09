import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ClassicLevel } from 'classic-level';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TARGET = path.join(os.homedir(), 'foundrydata', 'Data', 'systems', 'blades68');

const ENTRIES_TO_SYNC = [
  'system.json',
  'template.json',
  'module',
  'templates',
  'styles',
  'lang',
  'images',
  'themes',
  'assets',
  'packs',
];

/** LevelDB sublevel that holds each primary document type. */
const SUBLEVELS = {
  Item: 'items',
  Actor: 'actors',
  Macro: 'macros',
  RollTable: 'tables',
  JournalEntry: 'journal',
  Cards: 'cards',
  Playlist: 'playlists',
  Scene: 'scenes'
};

/** Embedded collections Foundry stores in their own sublevels, keyed by owning document type. */
const EMBEDDED = {
  Item: { effects: 'ActiveEffect' },
  Actor: { items: 'Item', effects: 'ActiveEffect' },
  RollTable: { results: 'TableResult' },
  JournalEntry: { pages: 'JournalEntryPage' }
};

/**
 * Write one document, hoisting each embedded collection into its own sublevel the way Foundry
 * does: the parent record keeps only the child ids, and every child lives under
 * `!<parent sublevel>.<field>!<parentId>.<childId>`. Writing children inline instead makes
 * Foundry read the parent with an empty collection, which silently drops item Active Effects.
 */
function writeDocument(batch, doc, { documentName, sublevel, key }) {
  const record = { ...doc };
  for (const [field, childName] of Object.entries(EMBEDDED[documentName] ?? {})) {
    const children = Array.isArray(doc[field]) ? doc[field] : [];
    record[field] = children.map((child) => child._id);
    for (const child of children) {
      writeDocument(batch, child, {
        documentName: childName,
        sublevel: `${sublevel}.${field}`,
        key: `${key}.${child._id}`
      });
    }
  }
  batch.put(`!${sublevel}!${key}`, JSON.stringify(record));
}

/**
 * Foundry migrates NeDB `foo.db` packs into a LevelDB folder `foo/` and then
 * keeps reading that folder — later `.db` overwrites are ignored. Rebuild the
 * LevelDB companion from the synced `.db` so YAML pack updates actually show up.
 */
async function rebuildPackLevelDbs(packsDir) {
  if (!existsSync(packsDir)) return;
  const system = JSON.parse(readFileSync(path.join(ROOT, 'system.json'), 'utf8'));
  const documentNames = new Map(
    system.packs.map((pack) => [path.basename(pack.path), pack.type])
  );
  const entries = await readdir(packsDir);
  for (const name of entries) {
    if (!name.endsWith('.db')) continue;
    const dbPath = path.join(packsDir, name);
    const levelDir = dbPath.replace(/\.db$/i, '');
    const documentName = documentNames.get(name) ?? 'Item';
    const sublevel = SUBLEVELS[documentName];
    if (!sublevel) {
      console.warn(`Skipping ${name}: no LevelDB sublevel known for ${documentName} packs.`);
      continue;
    }
    try {
      const docs = readFileSync(dbPath, 'utf8')
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));
      await rm(levelDir, { recursive: true, force: true });
      const db = new ClassicLevel(levelDir, { keyEncoding: 'utf8', valueEncoding: 'utf8' });
      await db.open();
      const batch = db.batch();
      for (const doc of docs) {
        writeDocument(batch, doc, { documentName, sublevel, key: doc._id });
      }
      await batch.write();
      await db.close();
      console.log(`Rebuilt LevelDB ${path.basename(levelDir)} (${docs.length} ${documentName} docs)`);
    } catch (err) {
      console.warn(`Could not rebuild LevelDB for ${name}: ${err.message}`);
      console.warn('Close Foundry / unlock the pack, then re-run npm run dev:sync.');
    }
  }
}

await mkdir(TARGET, { recursive: true });

for (const entry of ENTRIES_TO_SYNC) {
  const source = path.join(ROOT, entry);
  if (!existsSync(source)) continue;
  await cp(source, path.join(TARGET, entry), { recursive: true, force: true });
  console.log(`Synced ${entry} -> ${TARGET}`);
}

await rebuildPackLevelDbs(path.join(TARGET, 'packs'));

console.log(`\nSystem deployed to ${TARGET}`);
console.log('Restart/refresh the foundry_14 container world to pick up changes.');
