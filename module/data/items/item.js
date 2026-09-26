import { BladesItemData } from "../item.js";

const { fields } = foundry.data;

/**
 * Item type "item" (plain gear/loadout item) -- mixes default + logic +
 * activatedEffect. item.html renders load/class/uses/num_available as free
 * text inputs even though these are Number fields; equipped/bonus_equipped/
 * uses_used have no UI here -- they're set by the actor-side loadout
 * checkboxes (see module/blades-actor-sheet.js).
 */
export class ItemItemData extends BladesItemData {
  static defineSchema() {
    return {
      ...BladesItemData.defaultFields(),
      ...BladesItemData.logicFields(),
      ...BladesItemData.activatedEffectFields(),
      class: new fields.StringField({ required: false, blank: true, initial: "" }),
      load: new fields.NumberField({ required: false, initial: 0 }),
      uses: new fields.NumberField({ required: false, initial: 1 }),
      uses_used: new fields.NumberField({ required: false, initial: 0 }),
      additional_info: new fields.StringField({ required: false, blank: true, initial: "" }),
      equipped: new fields.BooleanField({ required: false, initial: false }),
      bonus_equipped: new fields.BooleanField({ required: false, initial: false }),
      num_available: new fields.NumberField({ required: false, initial: 1 })
    };
  }
}
