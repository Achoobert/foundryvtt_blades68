import { BladesItemData } from "../item.js";

const { fields } = foundry.data;

/** Item type "hunting_grounds" -- mixes default + activatedEffect. */
export class HuntingGroundsItemData extends BladesItemData {
  static defineSchema() {
    return {
      ...BladesItemData.defaultFields(),
      ...BladesItemData.activatedEffectFields(),
      class: new fields.StringField({ required: false, blank: true, initial: "" })
    };
  }
}
