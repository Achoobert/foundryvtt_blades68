const ITEM_TYPE_DEFAULTS = {
  playbook: {},
  ability: { playbook: '', unlocked: false },
  heritage: {},
  vice: { purveyor: '' },
  gear: { load: 1, carried: false },
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
    });
  });
}
