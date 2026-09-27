import { BladesItemData } from "../item.js";

const { fields } = foundry.data;

/**
 * Item type "faction" (a faction as a loot/relationship Item owned by a
 * character/crew -- distinct from the ACTOR type "factions", which is a
 * separate NPC-style document with its own sheet/hold/status UI). Mixes
 * default only.
 *
 * goal_1_clock_value/goal_2_clock_value have no static default anywhere in
 * template.json -- blades-item.js#prepareData() set them ad-hoc with no
 * schema backing. A strict DataModel needs explicit fields or the value
 * would be stripped on every save; added here with NumberField defaults.
 *
 * hold/status are schema-present (matching template.json) but are DEAD data
 * on this Item type -- faction.html never renders them (0 grep hits); they
 * only matter on the separate actor-type faction sheet. Kept only so
 * existing Item-type faction documents with stored values aren't silently
 * reset by strict validation.
 */
export class FactionItemData extends BladesItemData {
  static defineSchema() {
    return {
      ...BladesItemData.defaultFields(),
      type: new fields.StringField({ required: false, blank: true, initial: "" }),
      tier: new fields.NumberField({ required: false, initial: 0 }),

      goal_1: new fields.StringField({ required: false, blank: true, initial: "" }),
      goal_1_clock_max: new fields.NumberField({ required: false, initial: 0 }),
      goal_1_clock_value: new fields.NumberField({ required: false, initial: 0 }),
      goal_2: new fields.StringField({ required: false, blank: true, initial: "" }),
      goal_2_clock_max: new fields.NumberField({ required: false, initial: 0 }),
      goal_2_clock_value: new fields.NumberField({ required: false, initial: 0 }),
      goal_clock: new fields.NumberField({ required: false, initial: 0 }), // dead field, kept for compat

      turf: new fields.StringField({ required: false, blank: true, initial: "" }),
      assets: new fields.StringField({ required: false, blank: true, initial: "" }),
      quirks: new fields.StringField({ required: false, blank: true, initial: "" }),
      notables: new fields.StringField({ required: false, blank: true, initial: "" }),
      allies: new fields.StringField({ required: false, blank: true, initial: "" }),
      enemies: new fields.StringField({ required: false, blank: true, initial: "" }),
      situation: new fields.StringField({ required: false, blank: true, initial: "" }),
      prestige_ability: new fields.StringField({ required: false, blank: true, initial: "" }),
      notes: new fields.StringField({ required: false, blank: true, initial: "" }),

      hold: new fields.ObjectField({
        initial: () => ({ value: [1], max: 2, max_default: 2, name_default: "BITD.Hold", name: "BITD.Hold" })
      }),
      status: new fields.ObjectField({
        initial: () => ({ value: [4], max: 7, max_default: 7, name_default: "BITD.Status", name: "BITD.Status" })
      })
    };
  }

  /**
   * Ports the faction-only half of blades-item.js#prepareData(): normalizes
   * both goal clocks so a falsy value or an explicit 0 max never leaves the
   * clock stuck at zero size. The raw <option> HTML string the legacy code
   * additionally computed here (size_list_1/size_list_2) is presentational
   * only and is built by the sheet's _prepareContext instead -- see
   * module/blades-item-sheet-v2.js.
   */
  prepareDerivedData() {
    if (!this.goal_1_clock_value) this.goal_1_clock_value = 0;
    if (this.goal_1_clock_max === 0) this.goal_1_clock_max = 4;
    if (!this.goal_2_clock_value) this.goal_2_clock_value = 0;
    if (this.goal_2_clock_max === 0) this.goal_2_clock_max = 4;
  }
}
