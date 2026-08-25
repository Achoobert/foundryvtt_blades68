import { FACTION_CLOCK_FLAG } from '../utils/faction-clocks.js';
import FactionTrackerApp from './faction-tracker.js';

const { ApplicationV2 } = foundry.applications.api;
const HbsAppMixin = foundry.applications.api.HandlebarsApplicationMixin;

function resolveFactionClockOwner(clock) {
  const uuid = clock.getFlag('blades68', FACTION_CLOCK_FLAG);
  return uuid ? fromUuidSync(uuid) : null;
}

export default class ClockTrackerApp extends HbsAppMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'blades68-clock-tracker',
    classes: ['blades68', 'clock-tracker'],
    window: { title: 'BLADES68.ClockTracker.Title', resizable: true },
    position: { width: 560, height: 480 },
    actions: {
      setClockValue: this._onSetClockValue
    }
  };

  static PARTS = {
    body: { template: 'systems/blades68/templates/apps/clock-tracker.hbs' }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const embedded = game.actors.contents.flatMap((actor) =>
      actor.items
        .filter((item) => item.type === 'clock' && item.system.shared)
        .map((item) => ({
          itemId: item.id,
          actorId: actor.id,
          label: `${actor.name}: ${item.name}`,
          value: item.system.value,
          max: item.system.max,
          color: item.system.color
        }))
    );

    // Faction clocks live at world level because Items cannot embed Items.
    const world = game.items.contents
      .filter((item) => item.type === 'clock' && item.system.shared)
      .map((item) => {
        const owner = resolveFactionClockOwner(item);
        return {
          itemId: item.id,
          actorId: '',
          label: owner ? `${owner.name}: ${item.name}` : item.name,
          value: item.system.value,
          max: item.system.max,
          color: item.system.color
        };
      });

    context.clocks = [...embedded, ...world];

    return context;
  }

  static async _onSetClockValue(event, target) {
    const actorId = target.dataset.actorId;
    const item = actorId
      ? game.actors.get(actorId)?.items.get(target.dataset.itemId)
      : game.items.get(target.dataset.itemId);
    if (!item) return;
    const clicked = Number(target.dataset.value);
    const value = item.system.value === clicked ? clicked - 1 : clicked;
    await item.update({ 'system.value': value });
  }
}

export function registerTrackerRefreshHooks() {
  const refreshOpenTrackers = () => {
    for (const app of foundry.applications.instances.values()) {
      if (app instanceof ClockTrackerApp || app instanceof FactionTrackerApp) app.render();
    }
  };

  Hooks.on('createItem', refreshOpenTrackers);
  Hooks.on('updateItem', refreshOpenTrackers);
  Hooks.on('deleteItem', refreshOpenTrackers);
}
