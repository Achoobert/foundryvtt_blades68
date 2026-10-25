import { BladesItemData } from "../item.js";

const { fields } = foundry.data;

/**
 * Item type "crew_type" -- mixes activatedEffect only; description is
 * hand-declared here (not via the default mixin). experience_clues is a
 * plain string on this type (unlike class.html's array-typed field of the
 * same name) since it's edited through the same rich-text {{editor}} helper
 * as description.
 *
 * turfs: 20-cell grid, cell "8" pre-named "BITD.Lair" (the crew's home base).
 * turf_headers: 4 paginated unlock-condition headers shown between rows of
 * the turf grid.
 */
export class CrewTypeItemData extends BladesItemData {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ required: true, blank: true, initial: "" }),
      experience_clues: new fields.HTMLField({ required: false, blank: true, initial: "" }),
      ...BladesItemData.activatedEffectFields(),
      turfs: new fields.ObjectField({
        initial: BladesItemData.turfsInitial(20, { 8: { name: "BITD.Lair", value: 1 } })
      }),
      turf_headers: new fields.ObjectField({
        initial: BladesItemData.turfHeadersInitial(4)
      })
    };
  }
}
