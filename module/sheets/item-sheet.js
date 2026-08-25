import { BLADES68 } from '../config.js';
import { enrichSystemHtml } from '../utils/enrich-html.js';

const { ItemSheetV2 } = foundry.applications.sheets;
const HbsAppMixin = foundry.applications.api.HandlebarsApplicationMixin;

export default class Blades68ItemSheet extends HbsAppMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ['blades68', 'sheet', 'item'],
    position: { width: 480, height: 520 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      setRating: this._onSetRating
    }
  };

  static async _onSetRating(event, target) {
    const path = target.dataset.path;
    const clicked = Number(target.dataset.value);
    const current = foundry.utils.getProperty(this.document, path) ?? 0;
    const value = current === clicked ? clicked - 1 : clicked;
    await this.document.update({ [path]: value });
  }

  static PARTS = {
    body: { template: 'systems/blades68/templates/item/item-sheet.hbs' }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.item;
    context.system = this.item.system;
    context.config = BLADES68;
    context.systemFields = this.item.system.schema.fields;
    context.enriched = await enrichSystemHtml(this.item);
    return context;
  }
}
