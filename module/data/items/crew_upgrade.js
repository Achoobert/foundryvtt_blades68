import { BladesItemData } from "../item.js";

const { fields } = foundry.data;

/**
 * Item type "crew_upgrade" -- mixes ability + logic + activatedEffect.
 * crew_upgrade.html renders description, class ("CrewType" label but binds to
 * system.class -- the ability price/class fields, not this type's own
 * `crew_type` field), and price. `crew_type` itself has no input in this
 * template (dead in this UI, may be read elsewhere for filtering upgrades by
 * crew type) -- kept in schema.
 */
export class CrewUpgradeItemData extends BladesItemData {
  static defineSchema() {
    return {
      ...BladesItemData.abilityFields(),
      ...BladesItemData.logicFields(),
      ...BladesItemData.activatedEffectFields(),
      crew_type: new fields.StringField({ required: false, blank: true, initial: "" })
    };
  }
}
