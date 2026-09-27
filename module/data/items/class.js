import { BladesItemData } from "../item.js";

const { fields } = foundry.data;

// The 12 Blades attributes (legacy schema key is "base_skills" -- misnamed,
// these are attributes not actions -- kept verbatim for compendium compat).
const ATTRIBUTES = [
  "hunt", "study", "survey", "tinker", "finesse", "prowl",
  "skirmish", "wreck", "attune", "command", "consort", "sway"
];

/**
 * Item type "class" (playbook) -- mixes default + logic + activatedEffect.
 * class.html only edits description and experience_clues (both rich-text
 * editors); base_skills/special_resource have no UI here and are consumed by
 * the character sheet when assigning a class.
 *
 * NOTE: template.json declares experience_clues as an empty Array default,
 * but class.html binds it through the same rich-text {{editor}} helper as
 * description -- in practice the ProseMirror editor always overwrites it
 * with an HTML string on first save. Modeled here as HTMLField (matching
 * actual runtime behavior) rather than the literal template.json array
 * default; see module/blades-item-sheet-v2.js for the enrichment call this
 * requires.
 */
export class ClassItemData extends BladesItemData {
  static defineSchema() {
    return {
      ...BladesItemData.defaultFields(),
      ...BladesItemData.logicFields(),
      ...BladesItemData.activatedEffectFields(),
      experience_clues: new fields.HTMLField({ required: false, blank: true, initial: "" }),
      base_skills: new fields.SchemaField(
        Object.fromEntries(ATTRIBUTES.map((attr) => [
          attr,
          new fields.ArrayField(new fields.NumberField({ required: false, initial: 0 }), { initial: [0] })
        ]))
      ),
      special_resource: new fields.StringField({ required: false, blank: true, initial: "Special" })
    };
  }
}
