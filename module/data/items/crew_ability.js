import { BladesItemData } from "../item.js";

/**
 * Item type "crew_ability" -- mixes ability + activatedEffect (no logic).
 * crew_ability.html shows description, price, class only (no uses/uses_text
 * unlike plain ability.html), but the fields stay in schema since the ability
 * mixin defines them.
 */
export class CrewAbilityItemData extends BladesItemData {
  static defineSchema() {
    return {
      ...BladesItemData.abilityFields(),
      ...BladesItemData.activatedEffectFields()
    };
  }
}
