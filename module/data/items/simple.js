import { BladesItemData } from "../item.js";

/**
 * Shared DataModel for heritage / background / vice / crew_reputation.
 * All four route to templates/items/simple.html (per the legacy sheet's
 * `simple_item_types` template-selection list) and have no type-specific
 * fields beyond description. heritage/background/vice additionally mix in
 * activatedEffect in template.json; crew_reputation does not -- since those
 * fields are dead/unrendered on every type anyway, one shared class covers
 * all four without loss.
 */
export class SimpleItemData extends BladesItemData {
  static defineSchema() {
    return {
      ...BladesItemData.defaultFields(),
      ...BladesItemData.activatedEffectFields()
    };
  }
}
