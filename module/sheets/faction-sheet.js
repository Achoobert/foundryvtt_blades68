import Blades68ItemSheet from './item-sheet.js';
import { FACTION_CLOCK_FLAG, getFactionClocks } from '../utils/faction-clocks.js';

export default class FactionSheet extends Blades68ItemSheet {
  static DEFAULT_OPTIONS = {
    classes: ['faction'],
    position: { width: 560, height: 720 },
    actions: {
      addClock: this._onAddClock,
      deleteClock: this._onDeleteClock,
      setClockValue: this._onSetClockValue,
      toggleClockShared: this._onToggleClockShared
    }
  };

  static PARTS = {
    body: { template: 'systems/blades68/templates/item/faction-sheet.hbs' }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.clocks = getFactionClocks(this.item.uuid);
    return context;
  }

  static async _onAddClock(event, target) {
    await Item.create({
      name: game.i18n.localize('BLADES68.NewClock'),
      type: 'clock',
      folder: this.item.folder?.id ?? null,
      system: { shared: true },
      flags: { blades68: { [FACTION_CLOCK_FLAG]: this.item.uuid } }
    });
  }

  static async _onDeleteClock(event, target) {
    await game.items.get(target.dataset.itemId)?.delete();
  }

  static async _onSetClockValue(event, target) {
    const item = game.items.get(target.dataset.itemId);
    if (!item) return;
    const clicked = Number(target.dataset.value);
    const value = item.system.value === clicked ? clicked - 1 : clicked;
    await item.update({ 'system.value': value });
  }

  static async _onToggleClockShared(event, target) {
    const item = game.items.get(target.dataset.itemId);
    if (!item) return;
    await item.update({ 'system.shared': !item.system.shared });
  }
}
