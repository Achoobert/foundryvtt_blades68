/* global game, Actor, Hooks */
import { createdDocsTracker, requireSystemActive } from '../helpers.js';

const CORE_ID = 'token-action-hud-core';

const SKILLS = {
  insight: ['hunt', 'study', 'survey', 'tinker'],
  prowess: ['finesse', 'prowl', 'skirmish', 'wreck'],
  resolve: ['attune', 'command', 'consort', 'sway']
};

function coreActive() {
  return game.modules.get(CORE_ID)?.active === true;
}

function api() {
  return game.system.tokenActionHud;
}

export default function register(quench) {
  quench.registerBatch(
    'blades68.token-action-hud',
    (context) => {
      const { describe, it, assert, before, beforeEach, after } = context;
      const tracker = createdDocsTracker();
      let actor;

      before(async () => {
        requireSystemActive();
        actor = tracker.track(await Actor.create({ name: 'Quench TAH PC', type: 'character' }));
        await actor.update({
          'system.attributes.insight.skills.hunt.value': 3,
          'system.attributes.prowess.skills.prowl.value': 2
        });
      });

      after(async () => {
        await tracker.cleanup();
      });

      describe('system hook-up', function () {
        it('exposes the integration on game.system.tokenActionHud', function () {
          assert.isOk(api(), 'game.system.tokenActionHud');
          assert.isFunction(api().buildHudActionGroups);
          assert.equal(api().requiredCoreModuleVersion, '2');
        });

        it('declares token-action-hud-core as a recommended relationship', function () {
          const recommends = game.system.relationships?.recommends ?? [];
          const ids = [...recommends].map((r) => r.id);
          assert.include(ids, CORE_ID, 'system.json should recommend token-action-hud-core');
        });

        it('localizes the two layout headings', function () {
          assert.equal(game.i18n.localize('BITD.TAHActions'), 'Actions');
          assert.equal(game.i18n.localize('BITD.TAHAttributes'), 'Attributes');
        });
      });

      describe('action building', function () {
        it('builds one group per attribute plus a resistance group', function () {
          const groups = api().buildHudActionGroups(actor);
          const ids = groups.map((g) => g.groupData.id);
          assert.deepEqual(ids, ['insight', 'prowess', 'resolve', 'resistance']);
          assert.isTrue(groups.every((g) => g.groupData.type === 'system'));
        });

        it('puts the four action ratings in each attribute group', function () {
          const groups = api().buildHudActionGroups(actor);
          for (const [attribute, skills] of Object.entries(SKILLS)) {
            const group = groups.find((g) => g.groupData.id === attribute);
            assert.isOk(group, `${attribute} group`);
            assert.deepEqual(group.actions.map((a) => a.id), skills);
          }
        });

        it('puts the three attributes plus Vice in the resistance group', function () {
          const groups = api().buildHudActionGroups(actor);
          const resistance = groups.find((g) => g.groupData.id === 'resistance');
          assert.deepEqual(resistance.actions.map((a) => a.id), [
            'insight',
            'prowess',
            'resolve',
            'BITD.Vice'
          ]);
        });

        it('labels actions with their localized names, not raw keys', function () {
          const groups = api().buildHudActionGroups(actor);
          const hunt = groups.find((g) => g.groupData.id === 'insight').actions[0];
          assert.equal(hunt.name, game.i18n.localize('BITD.SkillsHunt'));
          assert.notInclude(hunt.name, 'BITD.');

          const vice = groups
            .find((g) => g.groupData.id === 'resistance')
            .actions.find((a) => a.id === 'BITD.Vice');
          assert.equal(vice.name, game.i18n.localize('BITD.Vice'));
        });

        it('shows the same dice pool the sheet would roll', function () {
          const groups = api().buildHudActionGroups(actor);
          const dice = actor.getRollData().dice_amount;
          const hunt = groups.find((g) => g.groupData.id === 'insight').actions[0];
          const prowl = groups.find((g) => g.groupData.id === 'prowess').actions[1];

          assert.equal(hunt.info1.text, String(dice.hunt));
          assert.equal(hunt.info1.text, '3');
          assert.equal(prowl.info1.text, String(dice.prowl));
          assert.equal(prowl.info1.text, '2');
        });

        it('gives every action a clickable handler instead of an encoded value', function () {
          const groups = api().buildHudActionGroups(actor);
          for (const group of groups) {
            for (const action of group.actions) {
              assert.isFunction(action.onClick, `${action.id} onClick`);
              assert.isUndefined(action.encodedValue, `${action.id} encodedValue`);
            }
          }
        });

        it('opens the normal roll dialog with the right dice when clicked', function () {
          const groups = api().buildHudActionGroups(actor);
          const hunt = groups.find((g) => g.groupData.id === 'insight').actions[0];

          const calls = [];
          const original = actor.rollAttributePopup;
          actor.rollAttributePopup = (name, dice) => calls.push([name, dice]);
          try {
            hunt.onClick();
          } finally {
            actor.rollAttributePopup = original;
          }

          assert.deepEqual(calls, [['hunt', 3]]);
        });

        it('builds nothing for non-character actors', async function () {
          const crew = tracker.track(await Actor.create({ name: 'Quench TAH Crew', type: 'crew' }));
          assert.deepEqual(api().buildHudActionGroups(crew), []);
          assert.deepEqual(api().buildHudActionGroups(null), []);
        });
      });

      describe('token-action-hud-core handshake', function () {
        // Skip this block entirely when token-action-hud-core is not enabled.
        beforeEach(function () {
          if (!coreActive()) this.skip();
        });

        it('completed the registration handshake', function () {
          assert.isTrue(api().registered, 'tokenActionHudSystemReady was never answered');
          assert.isFunction(api().SystemManager);
        });

        it('socketlib is active, so core can finish booting', function () {
          assert.isTrue(game.modules.get('socketlib')?.active === true);
        });

        it('registered the Actions and Attributes layout', function () {
          const layout = api().defaults.layout;
          assert.deepEqual(layout.map((l) => l.id), ['actions', 'attributes']);
          assert.deepEqual(layout[0].groups.map((g) => g.nestId), [
            'actions_insight',
            'actions_prowess',
            'actions_resolve'
          ]);
          assert.deepEqual(layout[1].groups.map((g) => g.nestId), ['attributes_resistance']);
          assert.deepEqual(api().defaults.groups.map((g) => g.id), [
            'insight',
            'prowess',
            'resolve',
            'resistance'
          ]);
        });

        it('hands core a usable RollHandler instance', function () {
          // Core does `getRollHandler(id) ?? new RollHandler`, which does not catch a
          // `false` return, so a falsy handler throws before the HUD can render.
          const coreApi = game.modules.get(CORE_ID).api;
          const manager = new (api().SystemManager)(CORE_ID);
          const handler = manager.getRollHandler('core');
          assert.instanceOf(handler, coreApi.RollHandler);
        });

        it('built the HUD without errors', function () {
          assert.isOk(game.tokenActionHud, 'game.tokenActionHud should exist once core is ready');
        });
      });
    },
    { displayName: 'Blades68: Token Action HUD' }
  );
}
