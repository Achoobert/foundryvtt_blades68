/* global Actor, game */
import { createdDocsTracker, requireSystemActive } from '../helpers.js';

export default function register(quench) {
  quench.registerBatch(
    'blades68.actors',
    (context) => {
      const { describe, it, assert, after } = context;
      const tracker = createdDocsTracker();

      after(async () => {
        await tracker.cleanup();
      });

      describe('character actor defaults', function () {
        it('creates a character with the Keys/Trauma/Coin defaults', async function () {
          requireSystemActive();
          const actor = tracker.track(await Actor.create({ name: 'Quench PC', type: 'character' }));

          assert.equal(actor.system.keys.max, 4);
          assert.lengthOf(actor.system.keys.list, 4);
          assert.isTrue(actor.system.keys.list.every((slot) => slot.key === ''), 'every slot should start empty and addable');
          assert.equal(actor.system.keys.list[0].experience, 0);
          assert.equal(actor.system.keys.list[0].deadlocked, false);
          assert.equal(actor.system.keys.list[0].deadlocked_to, '');

          assert.equal(actor.system.trauma.max, 4);
          assert.lengthOf(actor.system.trauma.options, 8);

          assert.equal(actor.system.stress.max, 9);
          assert.equal(actor.system.coins_max.hand, 4);
          assert.equal(actor.system.coins_max.stash, 40);
        });

        it('normalizes legacy marks/boomed Key slots into experience/deadlocked', async function () {
          requireSystemActive();
          const actor = tracker.track(await Actor.create({ name: 'Quench Legacy Keys PC', type: 'character' }));
          await actor.update({
            'system.keys.list': [
              { key: 'Commanding', marks: 2, boomed: true, deadlocked_to: 'controlling' }
            ]
          });

          const keys = actor.getComputedKeys();
          assert.lengthOf(keys, 4);
          assert.equal(keys[0].key, 'Commanding');
          assert.equal(keys[0].experience, 2, 'marks should migrate into experience');
          assert.equal(keys[0].deadlocked, true, 'boomed should migrate into deadlocked');
          assert.equal(keys[0].deadlocked_to, 'controlling');
          assert.equal(keys[1].key, '', 'remaining slots should pad empty');
          assert.equal(keys[1].experience, 0);
          assert.equal(keys[1].deadlocked, false);
          assert.equal(keys[1].deadlocked_to, '');
        });

        it('renders the character sheet without error', async function () {
          this.timeout(10000);
          const actor = tracker.track(await Actor.create({ name: 'Quench Sheet Render', type: 'character' }));
          const sheet = actor.sheet;

          await sheet._render(true);
          try {
            assert.isTrue(sheet.rendered);
            assert.isAbove(sheet.element.find('.window-content').length, 0);
          } finally {
            await sheet.close();
          }
        });
      });

      describe('crew extra Key effect', function () {
        async function extraKeyUpgradeFromPack() {
          const pack = game.packs.get('blades68.blades68_crew_upgrades');
          const docs = await pack.getDocuments();
          return docs.find((doc) => doc.name === 'Awakened (+1 key/deadlock)');
        }

        it('transfers +1 bonus_keys onto the owning crew', async function () {
          requireSystemActive();
          const pack = game.packs.get('blades68.blades68_crew_upgrades');
          assert.isOk(pack, 'blades68.blades68_crew_upgrades pack should exist');

          const upgrade = await extraKeyUpgradeFromPack();
          assert.isOk(upgrade, 'Awakened (+1 key/deadlock) should be in the pack');

          const crew = tracker.track(await Actor.create({ name: 'Quench Extra Key Crew', type: 'crew' }));
          assert.equal(crew.system.scoundrel.bonus_keys, 0);

          await crew.createEmbeddedDocuments('Item', [upgrade.toObject()]);
          assert.equal(
            Number(crew.system.scoundrel.bonus_keys),
            1,
            'passive upgrade effect should add to crew system.scoundrel.bonus_keys'
          );
        });

        it('linked character gains an extra Key slot from the crew bonus', async function () {
          this.timeout(10000);
          requireSystemActive();

          const upgrade = await extraKeyUpgradeFromPack();
          assert.isOk(upgrade, 'Awakened (+1 key/deadlock) should be in the pack');

          const crew = tracker.track(await Actor.create({ name: 'Quench Linked Extra Key Crew', type: 'crew' }));
          await crew.createEmbeddedDocuments('Item', [upgrade.toObject()]);

          const character = tracker.track(await Actor.create({ name: 'Quench Linked Extra Key PC', type: 'character' }));
          assert.equal(character.getMaxKeys(), 4, 'unlinked PC should keep the template max');
          assert.lengthOf(character.getComputedKeys(), 4);

          await character.update({
            'system.crew': [{ id: crew.id, name: crew.name, description: '', img: crew.img }]
          });

          assert.equal(character.getBonusKeys(), 1);
          assert.equal(character.getMaxKeys(), 5);
          assert.lengthOf(character.getComputedKeys(), 5, 'crew bonus should pad one extra empty slot');

          const sheet = character.sheet;
          await sheet._render(true);
          try {
            const data = await sheet.getData();
            assert.equal(data.system.keys.max, 5);
            assert.lengthOf(data.system.keys.list, 5);
          } finally {
            await sheet.close();
          }
        });

        it('character ability effect adds to keys.max without a crew', async function () {
          requireSystemActive();
          const character = tracker.track(await Actor.create({ name: 'Quench PC Extra Key Ability', type: 'character' }));
          await character.createEmbeddedDocuments('Item', [{
            name: 'Extra Key',
            type: 'ability',
            effects: [{
              name: 'add key',
              img: 'systems/blades68/styles/assets/icons/Icon.3_13.webp',
              transfer: true,
              disabled: false,
              type: 'base',
              system: {
                changes: [{
                  key: 'system.keys.max',
                  type: 'add',
                  value: '1',
                  priority: null,
                  phase: 'initial'
                }]
              }
            }]
          }]);

          assert.equal(Number(character.system.keys.max), 5, 'ability AE should raise the PC keys.max');
          assert.equal(character.getMaxKeys(), 5);
          assert.lengthOf(character.getComputedKeys(), 5);
        });
      });

      describe('crew Mastery effect', function () {
        async function masteryUpgradeFromPack() {
          const pack = game.packs.get('blades68.blades68_crew_upgrades');
          const docs = await pack.getDocuments();
          return docs.find((doc) => doc.name === 'Mastery');
        }

        it('transfers mastery onto the owning crew', async function () {
          requireSystemActive();
          const upgrade = await masteryUpgradeFromPack();
          assert.isOk(upgrade, 'Mastery should be in the blades68 crew upgrades pack');

          const crew = tracker.track(await Actor.create({ name: 'Quench Mastery Crew', type: 'crew' }));
          assert.equal(crew.system.scoundrel.mastery, false);

          await crew.createEmbeddedDocuments('Item', [upgrade.toObject()]);
          assert.equal(
            crew.system.scoundrel.mastery,
            true,
            'passive upgrade effect should set crew system.scoundrel.mastery'
          );
        });

        it('linked character may mark the 4th box in every skill', async function () {
          this.timeout(10000);
          requireSystemActive();

          const upgrade = await masteryUpgradeFromPack();
          assert.isOk(upgrade, 'Mastery should be in the blades68 crew upgrades pack');

          const crew = tracker.track(await Actor.create({ name: 'Quench Mastery Linked Crew', type: 'crew' }));
          const character = tracker.track(await Actor.create({ name: 'Quench Mastery PC', type: 'character' }));

          assert.isFalse(character.getHasMastery(), 'unlinked PC should have no mastery');
          const capped = character.getComputedAttributes();
          assert.equal(capped.insight.skills.hunt.max, 3, 'action ratings cap at 3 without mastery');

          await crew.createEmbeddedDocuments('Item', [upgrade.toObject()]);
          await character.update({
            'system.crew': [{ id: crew.id, name: crew.name, description: '', img: crew.img }]
          });

          assert.isTrue(character.getHasMastery(), 'linked PC should pick up crew mastery');
          const mastered = character.getComputedAttributes();
          for (const [attribute, data] of Object.entries(mastered)) {
            for (const [skill, values] of Object.entries(data.skills)) {
              assert.equal(values.max, 4, `${attribute}.${skill} should allow a 4th rating box`);
            }
          }

          const sheet = character.sheet;
          await sheet._render(true);
          try {
            const huntBoxes = sheet.element.find('[id^="attributes-"][id*="-hunt-"]');
            assert.isAbove(huntBoxes.filter('[value="4"]').length, 0, 'a 4th rating radio should render');
            assert.lengthOf(
              sheet.element.find(`[data-tooltip="${game.i18n.localize('BITD.NoMastery')}"]`),
              0,
              'the "lacks Mastery" placeholder box should be gone'
            );
          } finally {
            await sheet.close();
          }
        });
      });

      describe('crew actor defaults', function () {
        it('creates a crew with the tier/coin/turf/vault defaults', async function () {
          requireSystemActive();
          const actor = tracker.track(await Actor.create({ name: 'Quench Crew', type: 'crew' }));

          assert.equal(actor.system.tier, 0);
          assert.equal(actor.system.coins.max, 4);
          assert.equal(actor.system.turf.max, 6);
          assert.equal(actor.system.max.heat, 9);
          assert.equal(actor.system.max.tier, 4);
          assert.equal(actor.system.max.wanted, 4);
          assert.equal(actor.system.max.rep, 12);
        });
      });
    },
    { displayName: 'Actor data model' }
  );
}
