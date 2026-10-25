import { BladesItemData } from "../item.js";

const { fields } = foundry.data;

/**
 * Item type "prison" -- no template.json mixins at all; description declared
 * standalone. 9-cell turf grid, cell "4" pre-named "BITD.Prison". No
 * turf_headers/pagination (prison.html's turf grid is smaller and unpaginated
 * compared to crew_type's 20-cell grid).
 */
export class PrisonItemData extends BladesItemData {
  static defineSchema() {
    return {
      ...BladesItemData.defaultFields(),
      turfs: new fields.ObjectField({
        initial: BladesItemData.turfsInitial(9, { 4: { name: "BITD.Prison", value: 1 } })
      })
    };
  }
}
