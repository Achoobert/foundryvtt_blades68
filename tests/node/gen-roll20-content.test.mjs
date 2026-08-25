import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { writeRoll20Documents } from '../../scripts/gen-roll20-content.mjs';

test('writeRoll20Documents replaces Item pack sources and leaves tables untouched', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'blades68-roll20-'));

  try {
    for (const pack of ['playbooks', 'items', 'factions', 'tables']) {
      await mkdir(path.join(root, 'packs-source', pack), { recursive: true });
      await writeFile(path.join(root, 'packs-source', pack, 'old.json'), '{}');
    }

    const counts = await writeRoll20Documents(
      {
        heritage_info: 'Akoros',
        playbook_ability_test: 'Test Ability',
        playbook_ability_test_description: 'Ability text.',
        faction_test: 'Test Faction',
        faction_test_notes: 'Faction text.'
      },
      root
    );

    assert.deepEqual(counts, { playbooks: 1, items: 1, factions: 1 });
    assert.deepEqual(await readdir(path.join(root, 'packs-source', 'tables')), ['old.json']);

    for (const pack of ['playbooks', 'items', 'factions']) {
      const files = await readdir(path.join(root, 'packs-source', pack));
      assert.equal(files.length, 1);
      assert.notEqual(files[0], 'old.json');
      const document = JSON.parse(await readFile(path.join(root, 'packs-source', pack, files[0]), 'utf8'));
      assert.equal(document._key, `!items!${document._id}`);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
