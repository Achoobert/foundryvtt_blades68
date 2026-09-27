import { BladesItemData } from "../item.js";

const { fields } = foundry.data;

/**
 * Item type "trouble" -- no template.json mixins.
 *
 * `name` is a redundant top-level dupe of Item#name that trouble.html never
 * reads or writes (unused) -- kept in schema only for back-compat with any
 * existing stored value.
 *
 * `escilation` is a MISSPELLING of "escalation" baked into existing world/
 * compendium data -- the field key must stay `escilation` verbatim or
 * existing Trouble items lose their escalation text.
 */
export class TroubleItemData extends BladesItemData {
  static defineSchema() {
    return {
      name: new fields.StringField({ required: false, blank: true, initial: "" }),
      ...BladesItemData.defaultFields(),
      ongoing: new fields.BooleanField({ required: false, initial: false }),
      // Plain textarea (triple-stash render, not the {{editor}} widget) -- StringField, not HTMLField.
      escilation: new fields.StringField({ required: false, blank: true, initial: "" }),
      group: new fields.StringField({
        required: false, blank: true, initial: "",
        choices: ["", "light_crew", "heavy_crew", "light_local", "heavy_local"]
      })
    };
  }
}
