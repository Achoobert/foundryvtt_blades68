const ACTOR_TYPES = ['character', 'npc', 'crew'];
const ITEM_TYPES = [
  'faction',
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

    describe('Character sheet layouts', () => {
      it('renders keys, harm, load items, abilities, and friends', async () => {
        const actor = await Actor.create({ name: 'Quench Layout PC', type: 'character' });
        try {
          await actor.createEmbeddedDocuments('Item', [
            {
              name: 'Fine wrenching tools',
              type: 'gear',
              system: { load: 0, playbook: 'intellectual', carried: false }
            },
            {
              name: 'A Blade or Two',
              type: 'gear',
              system: { load: 1, playbook: '', carried: false }
            },
            {
              name: 'Unalloyed Genius',
              type: 'ability',
              system: { unlocked: true, description: '<p>Craft better.</p>' }
            },
            {
              name: 'Faden, an innovative doctor',
              type: 'contact',
              system: { relationship: 'friend', description: '<p>A dangerous fraud.</p>' }
            }
          ]);
          await actor.sheet.render(true);
          const root = actor.sheet.element;
          assert.exists(root.querySelector('.keys-deadlocks-head'), 'keys header');
          assert.lengthOf(root.querySelectorAll('.harm-tier'), 4);
          assert.exists(root.querySelector('.harm-tier.slots-2'), 'two-slot harm row');
          assert.exists(root.querySelector('.playbook-gear .zero-load'), 'italic zero-load gear');
          assert.exists(root.querySelector('.common-gear .gear-row'), 'common gear');
          assert.exists(root.querySelector('.ability-row .ability-mark.unlocked'), 'unlocked ability');
          assert.exists(root.querySelector('.friend-row .rel-up.active'), 'friend relationship');
        } finally {
          await actor.sheet.close();
          await actor.delete();
        }
      });
    });

    describe('Crew sheet abilities', () => {
      it('shows an ability title, inline description, hover text, and item action', async () => {
        const actor = await Actor.create({ name: 'Quench Ability Crew', type: 'crew' });
        try {
          const [ability] = await actor.createEmbeddedDocuments('Item', [
            {
              name: 'Mutual Aid',
              type: 'crew-ability',
              system: { description: '<p>Support one allied faction.</p>' }
            }
          ]);
          await actor.sheet.render(true);

          const row = actor.sheet.element.querySelector(
            `.crew-ability-row[data-item-id="${ability.id}"]`
          );
          assert.exists(row, 'crew ability row');
          assert.equal(row.querySelector('.item-name').textContent.trim(), 'Mutual Aid');
          assert.equal(
            row.querySelector('.crew-ability-description').textContent.trim(),
            'Support one allied faction.'
          );
          assert.equal(row.getAttribute('title'), 'Support one allied faction.');
          assert.equal(row.dataset.action, 'openItem');
        } finally {
          await actor.sheet.close();
          await actor.delete();
        }
      });
    });

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

    describe('Rich text fields use an active ProseMirror element', () => {
      it('renders system.notes as a <prose-mirror> element', async () => {
        const actor = await Actor.create({ name: 'Quench Sheet Editor', type: 'npc' });
        try {
          await actor.sheet.render(true);
          const editor = actor.sheet.element.querySelector('prose-mirror[name="system.notes"]');
          assert.exists(editor, 'notes editor element');
        } finally {
          await actor.sheet.close();
          await actor.delete();
        }
      });
    });

    describe('NPC playbook drop target', () => {
      const dropOn = (element, data) => {
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', JSON.stringify(data));
        element.dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true }));
      };

      it('writes a dropped playbook name into system.playbook', async () => {
        const actor = await Actor.create({ name: 'Quench Sheet Drop', type: 'npc' });
        const playbook = await Item.create({ name: 'Quench Cutter', type: 'playbook' });
        try {
          await actor.sheet.render(true);
          const zone = actor.sheet.element.querySelector('[data-drop="playbook"]');
          dropOn(zone, { type: 'Item', uuid: playbook.uuid });
          await new Promise((resolve) => setTimeout(resolve, 100));
          assert.equal(actor.system.playbook, 'Quench Cutter');
        } finally {
          await actor.sheet.close();
          await playbook.delete();
          await actor.delete();
        }
      });

      it('ignores dropped items that are not playbooks', async () => {
        const actor = await Actor.create({ name: 'Quench Sheet Drop Ignored', type: 'npc' });
        const gear = await Item.create({ name: 'Quench Crowbar', type: 'gear' });
        try {
          await actor.sheet.render(true);
          const zone = actor.sheet.element.querySelector('[data-drop="playbook"]');
          dropOn(zone, { type: 'Item', uuid: gear.uuid });
          await new Promise((resolve) => setTimeout(resolve, 100));
          assert.equal(actor.system.playbook, '');
        } finally {
          await actor.sheet.close();
          await gear.delete();
          await actor.delete();
        }
      });
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
