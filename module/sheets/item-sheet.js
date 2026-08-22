import { BLADES68 } from '../config.js';

const { ItemSheetV2 } = foundry.applications.sheets;
const HbsAppMixin = foundry.applications.api.HandlebarsApplicationMixin;

export default class Blades68ItemSheet extends HbsAppMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ['blades68', 'sheet', 'item'],
    position: { width: 480, height: 520 },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  static PARTS = {
    body: { template: 'systems/blades68/templates/item/item-sheet.hbs' }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.item;
    context.system = this.item.system;
    context.config = BLADES68;
    return context;
  }
}
