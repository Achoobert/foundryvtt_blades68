import { BladesItemData } from "../item.js";

/**
 * Item type "ability" -- mixes ability + logic + activatedEffect.
 * ability.html only renders description/price/class/uses/uses_text; the rest
 * (uses_used/purchased/class_default/unlocked) is set programmatically by the
 * character-sheet purchase flow.
 */
export class AbilityItemData extends BladesItemData {
  static defineSchema() {
    return {
      ...BladesItemData.abilityFields(),
      ...BladesItemData.logicFields(),
      ...BladesItemData.activatedEffectFields()
    };
  }
}
