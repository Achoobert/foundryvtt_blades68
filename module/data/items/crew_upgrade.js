import { BladesItemData } from "../item.js";

const { fields } = foundry.data;


export class CrewUpgradeItemData extends BladesItemData {
  static defineSchema() {
    return {
      ...BladesItemData.logicFields(),
      ...BladesItemData.activatedEffectFields(),
      ...BladesItemData.abilityFields(),
      crew_type: new fields.StringField({ required: false, blank: true, initial: "" })
    };
  }
}
