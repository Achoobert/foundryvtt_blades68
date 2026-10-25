import { BladesItemData } from "../item.js";


export class AbilityItemData extends BladesItemData {
  static defineSchema() {
    return {
      ...BladesItemData.logicFields(),
      ...BladesItemData.activatedEffectFields(),
      ...BladesItemData.abilityFields()
    };
  }
}
