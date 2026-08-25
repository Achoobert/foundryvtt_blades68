import { BLADES68 } from '../config.js';
import { rollFortune } from '../dice/roll-engine.js';
import { promptDicePoolSize } from '../dice/roll-dialog.js';

const { ApplicationV2 } = foundry.applications.api;
const HbsAppMixin = foundry.applications.api.HandlebarsApplicationMixin;

export default class FactionTrackerApp extends HbsAppMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'blades68-faction-tracker',
    classes: ['blades68', 'faction-tracker'],
    window: { title: 'BLADES68.FactionTracker.Title', resizable: true },
    position: { width: 900, height: 640 },
    actions: {
      setTier: this._onSetTier,
      cycleHold: this._onCycleHold,
      adjustStatus: this._onAdjustStatus,
      toggleWar: this._onToggleWar,
      fortuneRoll: this._onFortuneRoll
    }
  };

  static PARTS = {
    body: { template: 'systems/blades68/templates/apps/faction-tracker.hbs' }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const factions = game.items.filter((item) => item.type === 'faction');

    context.config = BLADES68;
    context.columns = BLADES68.FACTION_CATEGORIES.map((category) => ({
      category,
      factions: factions
        .filter((item) => item.system.category === category)
        .sort((a, b) => b.system.tier - a.system.tier)
    }));

    return context;
  }

  static async _onSetTier(event, target) {
    const faction = game.items.get(target.dataset.itemId);
    const clicked = Number(target.dataset.value);
    const value = faction.system.tier === clicked ? clicked - 1 : clicked;
    await faction.update({ 'system.tier': value });
  }

  static async _onCycleHold(event, target) {
    const faction = game.items.get(target.dataset.itemId);
    const next = faction.system.hold === 'weak' ? 'strong' : 'weak';
    await faction.update({ 'system.hold': next });
  }

  static async _onAdjustStatus(event, target) {
    const faction = game.items.get(target.dataset.itemId);
    const delta = Number(target.dataset.delta);
    const value = Math.min(3, Math.max(-3, faction.system.status + delta));
    await faction.update({ 'system.status': value });
  }

  static async _onToggleWar(event, target) {
    const faction = game.items.get(target.dataset.itemId);
    await faction.update({ 'system.war': !faction.system.war });
  }

  static async _onFortuneRoll(event, target) {
    const poolSize = await promptDicePoolSize(1);
    if (poolSize === null) return;
    await rollFortune({ poolSize });
  }
}
