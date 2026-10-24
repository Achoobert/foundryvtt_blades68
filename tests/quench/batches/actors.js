
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

          await sheet.render(true);
          try {
            assert.isTrue(sheet.rendered);
            assert.isAbove(sheet.element.querySelectorAll('.window-content').length, 0);
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

          const upgradeData = upgrade.toObject();
          upgradeData.system.unlocked = Number(upgradeData.system.price) || 0;
          await crew.createEmbeddedDocuments('Item', [upgradeData]);
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
          const upgradeData = upgrade.toObject();
          upgradeData.system.unlocked = Number(upgradeData.system.price) || 0;
          await crew.createEmbeddedDocuments('Item', [upgradeData]);

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
          await sheet.render(true);
          try {
            const data = await sheet._prepareContext();
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

        it('Hull class overrides keys.max to 0 and add effects can grant slots back', async function () {
          requireSystemActive();
          const pack = game.packs.get('blades68.blades68_classes');
          const docs = await pack.getDocuments();
          const hull = docs.find((doc) => doc.name === 'Hull');
          assert.isOk(hull, 'Hull should be in the blades68 classes pack');

          const character = tracker.track(await Actor.create({ name: 'Quench Hull Keys PC', type: 'character' }));
          await character.createEmbeddedDocuments('Item', [hull.toObject()]);

          assert.equal(Number(character.system.keys.max), 0, 'Hull playbook AE should zero keys.max');
          assert.equal(character.getMaxKeys(), 0);
          assert.lengthOf(character.getComputedKeys(), 0, 'computed list should truncate to max 0');

          await character.createEmbeddedDocuments('Item', [{
            name: 'Human Memories',
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

          assert.equal(Number(character.system.keys.max), 1, 'add-key AE should stack on Hull override');
          assert.equal(character.getMaxKeys(), 1);
          assert.lengthOf(character.getComputedKeys(), 1);
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

          const upgradeData = upgrade.toObject();
          upgradeData.system.unlocked = Number(upgradeData.system.price) || 0;
          await crew.createEmbeddedDocuments('Item', [upgradeData]);
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

          const upgradeData = upgrade.toObject();
          upgradeData.system.unlocked = Number(upgradeData.system.price) || 0;
          await crew.createEmbeddedDocuments('Item', [upgradeData]);
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
          await sheet.render(true);
          try {
            const huntBoxes4th = sheet.element.querySelectorAll('[id^="attributes-"][id*="-hunt-"][value="4"]');
            assert.isAbove(huntBoxes4th.length, 0, 'a 4th rating radio should render');
            assert.lengthOf(
              sheet.element.querySelectorAll(`[data-tooltip="${game.i18n.localize('BITD.NoMastery')}"]`),
              0,
              'the "lacks Mastery" placeholder box should be gone'
            );
          } finally {
            await sheet.close();
          }
        });
      });

      describe('crew Vault effect', function () {
        async function vaultUpgradeFromPack() {
          const pack = game.packs.get('blades68.blades68_crew_upgrades');
          const docs = await pack.getDocuments();
          return docs.find((doc) => doc.name === 'Vault');
        }

        it('transfers vault.max onto the owning crew once unlocked, and the sheet renders it', async function () {
          this.timeout(10000);
          requireSystemActive();
          const upgrade = await vaultUpgradeFromPack();
          assert.isOk(upgrade, 'Vault should be in the blades68 crew upgrades pack');

          const crew = tracker.track(await Actor.create({ name: 'Quench Vault Crew', type: 'crew' }));
          assert.equal(crew.system.vault.max, 0, 'vault.max should start at 0 with no Vault upgrade');

          const upgradeData = upgrade.toObject();
          upgradeData.system.unlocked = Number(upgradeData.system.price) || 0;
          await crew.createEmbeddedDocuments('Item', [upgradeData]);
          assert.equal(
            Number(crew.system.vault.max),
            16,
            'passive upgrade effect should add to crew system.vault.max'
          );

          const sheet = crew.sheet;
          await sheet.render(true);
          try {
            const data = await sheet._prepareContext();
            assert.equal(
              data.system.vault.max,
              16,
              'sheet context must reflect the effect-applied vault.max, not raw source'
            );
            assert.isAbove(
              sheet.element.querySelectorAll(`#crew-${crew.id}-coins-vault`).length,
              0,
              'the Vault coin row should render once vault.max is non-zero'
            );
          } finally {
            await sheet.close();
          }
        });
      });

      describe('character load', function () {
        
        async function gearActor(name, load, count = 1) {
          const actor = tracker.track(await Actor.create({ name, type: 'character' }));
          const items = Array.from({ length: count }, (_, i) => ({
            name: `Quench Gear ${i + 1}`,
            type: 'item',
            system: { load, equipped: true }
          }));
          if (count) await actor.createEmbeddedDocuments('Item', items);
          return actor;
        }

        it('keeps the declared tier when carrying past its max', async function () {
          requireSystemActive();
          const actor = await gearActor('Quench Overload PC', 1, 5);
          await actor.update({ 'system.selected_load_level': 'BITD.Light' });

          assert.equal(actor.system.loadout, 5);
          assert.equal(actor.system.load_level, 'BITD.Light', 'tier must not auto-promote');
          assert.equal(actor.system.base_max_load, 3);
          assert.equal(actor.system.load_max, 3);
          assert.isTrue(actor.system.over_load);
        });

        it('raises the max when the player picks a heavier tier', async function () {
          requireSystemActive();
          const actor = await gearActor('Quench Tier PC', 1, 5);

          await actor.update({ 'system.selected_load_level': 'BITD.Normal' });
          assert.equal(actor.system.base_max_load, 5);
          assert.isFalse(actor.system.over_load);

          await actor.update({ 'system.selected_load_level': 'BITD.Heavy' });
          assert.equal(actor.system.base_max_load, 6);
        });

        it('defaults to Normal when no tier has been picked', async function () {
          requireSystemActive();
          const actor = await gearActor('Quench Default Tier PC', 0, 0);
          assert.equal(actor.system.selected_load_level, '');
          assert.equal(actor.system.load_level, 'BITD.Normal');
          assert.equal(actor.system.base_max_load, 5);
        });

        it('reports no bonus and no sources without a bonus item', async function () {
          requireSystemActive();
          const actor = await gearActor('Quench No Bonus PC', 0, 0);
          assert.equal(actor.system.load_bonus, 0);
          assert.lengthOf(actor.getLoadBonusSources(), 0, 'sheet hides the +N when this is empty');
        });

        it('adds an ability load_bonus on top of the tier max', async function () {
          requireSystemActive();
          const actor = await gearActor('Quench Bonus PC', 1, 1);
          await actor.update({ 'system.selected_load_level': 'BITD.Light' });
          await actor.createEmbeddedDocuments('Item', [
            { name: 'Quench Rigging', type: 'ability', system: { load_bonus: 2, description: 'Free load.' } }
          ]);

          assert.equal(actor.system.load_bonus, 2);
          assert.equal(actor.system.base_max_load, 3);
          assert.equal(actor.system.load_max, 5);

          const sources = actor.getLoadBonusSources();
          assert.lengthOf(sources, 1);
          assert.equal(sources[0].name, 'Quench Rigging');
          assert.equal(sources[0].value, 2);
        });

        it('grants Mule its +2 through load_bonus, not a name match', async function () {
          this.timeout(10000);
          requireSystemActive();
          const pack = game.packs.get('blades68.ability');
          assert.isOk(pack, 'blades68.ability pack should exist');
          const mule = (await pack.getDocuments()).find((doc) => doc.name === '(C) Mule');
          assert.isOk(mule, '(C) Mule should be in the ability pack');
          assert.equal(mule.system.load_bonus, 2);

          const actor = await gearActor('Quench Mule PC', 0, 0);
          await actor.update({ 'system.selected_load_level': 'BITD.Light' });
          await actor.createEmbeddedDocuments('Item', [mule.toObject()]);

          assert.equal(actor.system.load_bonus, 2);
          assert.equal(actor.system.load_max, 5, 'Mule turns Light 3 into Light 5');
        });

        it('names the crew upgrade behind an add_load bonus', async function () {
          this.timeout(10000);
          requireSystemActive();
          const pack = game.packs.get('blades68.blades68_crew_upgrades');
          assert.isOk(pack, 'blades68.blades68_crew_upgrades pack should exist');
          const upgrade = (await pack.getDocuments()).find((doc) => doc.name.startsWith('Militant rigging'));
          assert.isOk(upgrade, 'Militant rigging should be in the pack');

          const crew = tracker.track(await Actor.create({ name: 'Quench Load Crew', type: 'crew' }));
          const upgradeData = upgrade.toObject();
          upgradeData.system.unlocked = Number(upgradeData.system.price) || 0;
          await crew.createEmbeddedDocuments('Item', [upgradeData]);
          assert.equal(Number(crew.system.scoundrel.add_load), 2);

          const character = await gearActor('Quench Load Crew PC', 0, 0);
          assert.equal(character.getLoadBonus(), 0, 'unlinked PC gets nothing');

          await character.update({
            'system.crew': [{ id: crew.id, name: crew.name, description: '', img: crew.img }]
          });

          assert.equal(character.getLoadBonus(), 2);
          const sources = character.getLoadBonusSources();
          assert.lengthOf(sources, 1);
          assert.equal(sources[0].name, upgrade.name, 'hover should name the upgrade, not just the crew');
          assert.equal(sources[0].value, 2);
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
