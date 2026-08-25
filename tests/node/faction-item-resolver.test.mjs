import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeFactionName,
  resolveFactionItems
} from '../../module/pdf-import/faction-item-resolver.js';

function fakeItem(name, source = {}) {
  return {
    name,
    type: 'faction',
    source,
    updates: [],
    async update(data) {
      this.updates.push(data);
      this.name = data.name ?? this.name;
      return this;
    },
    toObject() {
      return { name: this.name, type: this.type, system: {}, ...this.source };
    }
  };
}

test('normalizeFactionName ignores punctuation, case, and repeated whitespace', () => {
  assert.equal(normalizeFactionName("Crow's   Foot"), normalizeFactionName('CROWS FOOT'));
});

test('resolveFactionItems updates an existing world faction matched by name', async () => {
  const world = fakeItem('Ink Lane Tabloids');
  let creates = 0;

  const [resolved] = await resolveFactionItems(
    [{ name: 'Ink Lane Tabloids', description: '<p>News.</p>', imagePath: 'ink.png' }],
    {
      worldItems: [world],
      compendiumItems: [],
      createItem: async () => {
        creates++;
      }
    }
  );

  assert.equal(resolved, world);
  assert.equal(creates, 0);
  assert.equal(world.updates[0].img, 'ink.png');
  assert.equal(world.updates[0]['system.description'], '<p>News.</p>');
});

test('resolveFactionItems clones a name-matched compendium faction into the world', async () => {
  const compendium = fakeItem('Mirror House', { img: 'icons/svg/city.svg' });
  const created = [];

  const [resolved] = await resolveFactionItems(
    [{ name: 'Mirror House', imagePath: 'mirror.png' }],
    {
      worldItems: [],
      compendiumItems: [compendium],
      createItem: async (data) => {
        const item = fakeItem(data.name, data);
        created.push(data);
        return item;
      }
    }
  );

  assert.equal(created.length, 1);
  assert.equal(created[0]._id, undefined);
  assert.equal(resolved.updates[0].img, 'mirror.png');
});

test('resolveFactionItems falls back to page order and does not create a duplicate', async () => {
  const first = fakeItem('Old Name');
  let creates = 0;

  const [resolved] = await resolveFactionItems(
    [{ name: 'New Name', imagePath: 'first-page.png' }],
    {
      worldItems: [first],
      compendiumItems: [],
      createItem: async () => {
        creates++;
      }
    }
  );

  assert.equal(resolved, first);
  assert.equal(creates, 0);
  assert.equal(first.name, 'New Name');
  assert.equal(first.updates[0].img, 'first-page.png');
});

test('resolveFactionItems does not use page-order fallback without imported art', async () => {
  const existing = fakeItem('Unrelated World Faction');
  let created;

  const [resolved] = await resolveFactionItems(
    [{ name: 'New Faction' }],
    {
      worldItems: [existing],
      compendiumItems: [],
      createItem: async (data) => {
        created = fakeItem(data.name, data);
        return created;
      }
    }
  );

  assert.equal(resolved, created);
  assert.equal(existing.updates.length, 0);
});
