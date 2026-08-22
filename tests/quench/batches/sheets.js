const ACTOR_TYPES = ['character', 'npc', 'crew', 'faction'];
const ITEM_TYPES = [
  'playbook',
  'ability',
  'heritage',
  'vice',
  'gear',
  'contact',
  'crew-playbook',
  'crew-ability',
  'upgrade',
  'cohort',
  'claim',
  'clock'
];

export default function registerSheetBatches(quench) {
  quench.registerBatch('blades68.sheets', (context) => {
    const { describe, it, assert } = context;

    describe('Actor sheets render without throwing', () => {
      for (const type of ACTOR_TYPES) {
        it(`renders the "${type}" actor sheet`, async () => {
          const actor = await Actor.create({ name: `Quench Sheet ${type}`, type });
          try {
            await actor.sheet.render(true);
            assert.isTrue(actor.sheet.rendered);
          } finally {
            await actor.sheet.close();
            await actor.delete();
          }
        });
      }
    });

    describe('Item sheets render without throwing', () => {
      for (const type of ITEM_TYPES) {
        it(`renders the "${type}" item sheet`, async () => {
          const item = await Item.create({ name: `Quench Sheet ${type}`, type });
          try {
            await item.sheet.render(true);
            assert.isTrue(item.sheet.rendered);
          } finally {
            await item.sheet.close();
            await item.delete();
          }
        });
      }
    });

    describe('Faction Tracker and Clock Tracker apps', () => {
      it('renders the Faction Tracker without throwing', async () => {
        const app = await game.blades68.openFactionTracker();
        assert.isTrue(app.rendered);
        await app.close();
      });

      it('renders the Clock Tracker without throwing', async () => {
        const app = await game.blades68.openClockTracker();
        assert.isTrue(app.rendered);
        await app.close();
      });
    });
  });
}
