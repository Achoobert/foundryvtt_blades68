import {
  buildFactionClockData,
  getFactionClocks
} from '/systems/blades68/module/utils/faction-clocks.js';
import { playbookGearSettled } from '/systems/blades68/module/utils/playbook-gear.js';

const ITEM_TYPE_DEFAULTS = {
  faction: { category: 'underworld', tier: 1, hold: 'weak', status: 0, war: false },
  playbook: {},
  ability: { playbook: '', unlocked: false },
  heritage: {},
  vice: { purveyor: '' },
  gear: { load: 1, carried: false, playbook: '' },
  contact: { relationship: 'friend', faction: '' },
  'crew-playbook': {},
  'crew-ability': { cost: 0, unlocked: false },
  upgrade: { quality: 0, purchased: false },
  cohort: { type: 'gang', quality: 0, harm: 0, armor: 0 },
  claim: { controlled: false },
  clock: { value: 0, max: 4, shared: false }
};

export default function registerItemBatches(quench) {
  quench.registerBatch('blades68.items', (context) => {
    const { describe, it, assert, after } = context;
    const created = [];

    after(async () => {
      for (const item of created) await item.delete();
    });

    describe('Item data models', () => {
      for (const [type, expected] of Object.entries(ITEM_TYPE_DEFAULTS)) {
        it(`creates a "${type}" item with expected defaults`, async () => {
          const item = await Item.create({ name: `Quench ${type}`, type });
          created.push(item);
          for (const [key, value] of Object.entries(expected)) {
            assert.deepEqual(item.system[key], value, `${type}.${key}`);
          }
        });
      }
    });

    describe('Faction clocks', () => {
      it('links world clock items to their faction by flag', async () => {
        const faction = await Item.create({ name: 'Quench Clock Faction', type: 'faction' });
        created.push(faction);

        const [clock] = await Item.createDocuments([
          buildFactionClockData(faction.uuid, { name: 'Quench Project', max: 6 })
        ]);
        created.push(clock);

        const clocks = getFactionClocks(faction.uuid);
        assert.lengthOf(clocks, 1);
        assert.equal(clocks[0].id, clock.id);
        assert.equal(clock.system.max, 6);
        assert.isTrue(clock.system.shared);
      });
    });

    describe('Embedded items on an actor', () => {
      it('embeds a clock item on a character and updates its value', async () => {
        const actor = await Actor.create({ name: 'Quench Clock Host', type: 'character' });
        try {
          const [clock] = await actor.createEmbeddedDocuments('Item', [
            { name: 'Quench Clock', type: 'clock', system: { max: 6 } }
          ]);
          assert.equal(clock.system.value, 0);
          assert.equal(clock.system.max, 6);

          await clock.update({ 'system.value': 3 });
          assert.equal(actor.items.get(clock.id).system.value, 3);
        } finally {
          await actor.delete();
        }
      });

      it('replaces playbook gear while preserving common gear', async () => {
        const sources = await Item.createDocuments([
          { name: 'Quench Common Kit', type: 'gear', system: { playbook: '' } },
          { name: 'Quench Hound Kit', type: 'gear', system: { playbook: 'hound' } },
          { name: 'Quench Swinger Kit', type: 'gear', system: { playbook: 'swinger' } }
        ]);
        created.push(...sources);
        const actor = await Actor.create({ name: 'Quench Playbook Host', type: 'character' });

        try {
          await actor.createEmbeddedDocuments('Item', [{ name: 'Hound', type: 'playbook' }]);
          await playbookGearSettled();
          assert.sameMembers(
            actor.items.filter((item) => item.type === 'gear').map((item) => item.name),
            ['Quench Common Kit', 'Quench Hound Kit']
          );

          // Sheet drops create through Item.create, not createEmbeddedDocuments.
          await Item.create({ name: 'Swinger', type: 'playbook' }, { parent: actor });
          await playbookGearSettled();
          assert.sameMembers(
            actor.items.filter((item) => item.type === 'gear').map((item) => item.name),
            ['Quench Common Kit', 'Quench Swinger Kit']
          );
          assert.deepEqual(
            actor.items.filter((item) => item.type === 'playbook').map((item) => item.name),
            ['Swinger']
          );
        } finally {
          await actor.delete();
        }
      });
    });
  });
}
