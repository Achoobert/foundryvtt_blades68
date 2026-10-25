import { BladesItemData } from "../item.js";


export class CrewAbilityItemData extends BladesItemData {
  static defineSchema() {
    return {
      ...BladesItemData.activatedEffectFields(),
      ...BladesItemData.abilityFields()
    };
  }
}
