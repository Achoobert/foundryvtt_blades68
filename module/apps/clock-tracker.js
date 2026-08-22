const { ApplicationV2 } = foundry.applications.api;
const HbsAppMixin = foundry.applications.api.HandlebarsApplicationMixin;

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

    context.clocks = game.actors.contents.flatMap((actor) =>
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

    return context;
  }

  static async _onSetClockValue(event, target) {
    const actor = game.actors.get(target.dataset.actorId);
    const item = actor?.items.get(target.dataset.itemId);
    if (!item) return;
    const clicked = Number(target.dataset.value);
    const value = item.system.value === clicked ? clicked - 1 : clicked;
    await item.update({ 'system.value': value });
  }
}

export function registerClockTrackerRefreshHooks() {
  const refreshOpenTracker = () => {
    for (const app of foundry.applications.instances.values()) {
      if (app instanceof ClockTrackerApp) app.render();
    }
  };

  Hooks.on('createItem', refreshOpenTracker);
  Hooks.on('updateItem', refreshOpenTracker);
  Hooks.on('deleteItem', refreshOpenTracker);
}
