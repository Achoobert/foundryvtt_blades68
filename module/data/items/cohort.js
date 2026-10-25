import { BladesItemData } from "../item.js";

const { fields } = foundry.data;

/**
 * Item type "cohort" -- default mixin only.
 *
 * NOTE on `cohort` and `harm`: template.json defaults these to single-element
 * arrays (["Gang"], ["No"]) because the legacy Handlebars {{#multiboxes}}
 * helper accepts either a single value or an array. But both are rendered as
 * plain HTML radio-input groups (`name="system.cohort"` / `name="system.harm"`),
 * and a browser radio group always submits one scalar value -- so at runtime,
 * after the very first save, these are always plain strings. blades-item.js's
 * _prepareCohort() switches on `item_data.cohort === "Gang"`/`"Expert"`
 * (a direct string comparison, not array-aware), which only ever matched
 * because of that post-save coercion. Modeled here as StringField (matching
 * actual runtime shape) so the tier-based scale/quality auto-calc below keeps
 * working correctly from the moment an item is created, not just after the
 * user resaves it once.
 */
export class CohortItemData extends BladesItemData {
  static defineSchema() {
    return {
      ...BladesItemData.defaultFields(),

      cohort: new fields.StringField({
        required: false, blank: false, initial: "Gang", choices: ["Gang", "Expert"]
      }),
      scale: new fields.NumberField({ required: false, initial: 0 }),
      quality: new fields.NumberField({ required: false, initial: 0 }),
      scale_override: new fields.BooleanField({ required: false, initial: false }),
      quality_override: new fields.BooleanField({ required: false, initial: false }),
      cohort_list: new fields.ObjectField({
        initial: () => ({
          Gang: { label: "BITD.Gang" },
          Expert: { label: "BITD.Expert" }
        })
      }),

      gang_type: new fields.ArrayField(new fields.StringField(), { initial: ["Adepts"] }),
      gang_type_list: new fields.ObjectField({
        initial: () => ({
          Adepts: { label: "BITD.GangTypeAdepts", description: "BITD.GangTypeAdeptsDescription" },
          Rooks: { label: "BITD.GangTypeRooks", description: "BITD.GangTypeRooksDescription" },
          Rovers: { label: "BITD.GangTypeRovers", description: "BITD.GangTypeRoversDescription" },
          Skulks: { label: "BITD.GangTypeSkulks", description: "BITD.GangTypeSkulksDescription" },
          Thugs: { label: "BITD.GangTypeThugs", description: "BITD.GangTypeThugsDescription" }
        })
      }),
      expert_type: new fields.StringField({ required: false, blank: true, initial: "" }),

      // Present in template.json, unused in cohort.html (edges_list/flaws_list
      // are used instead) -- kept for compendium/back-compat.
      status: new fields.ArrayField(new fields.StringField(), { initial: [] }),
      statuses: new fields.ArrayField(new fields.StringField(), { initial: [] }),
      edges: new fields.ArrayField(new fields.StringField(), { initial: [] }),
      flaws: new fields.ArrayField(new fields.StringField(), { initial: [] }),

      edges_list: new fields.ObjectField({
        initial: () => ({
          Fearsome: { label: "BITD.EdgesFearsome", description: "BITD.EdgesFearsomeDescription", selected: false },
          Independent: { label: "BITD.EdgesIndependent", description: "BITD.EdgesIndependentDescription", selected: false },
          Loyal: { label: "BITD.EdgesLoyal", description: "BITD.EdgesLoyalDescription", selected: false },
          Tenacious: { label: "BITD.EdgesTenacious", description: "BITD.EdgesTenaciousDescription", selected: false }
        })
      }),
      flaws_list: new fields.ObjectField({
        initial: () => ({
          Principled: { label: "BITD.FlawsPrincipled", description: "BITD.FlawsPrincipledDescription", selected: false },
          Savage: { label: "BITD.FlawsSavage", description: "BITD.FlawsSavageDescription", selected: false },
          Unreliable: { label: "BITD.FlawsUnreliable", description: "BITD.FlawsUnreliableDescription", selected: false },
          Wild: { label: "BITD.FlawsWild", description: "BITD.FlawsWildDescription", selected: false }
        })
      }),

      harm: new fields.StringField({
        required: false, blank: false, initial: "No",
        choices: ["No", "Weakened", "Impaired", "Broken", "Dead"]
      }),
      harm_list: new fields.ObjectField({
        initial: () => ({
          No: { label: "BITD.HarmNoHarm", description: "BITD.HarmNoHarmDescription", value: 0 },
          Weakened: { label: "BITD.HarmWeakened", description: "BITD.HarmWeakenedDescription", value: 1 },
          Impaired: { label: "BITD.HarmImpaired", description: "BITD.HarmImpairedDescription", value: 2 },
          Broken: { label: "BITD.HarmBroken", description: "BITD.HarmBrokenDescription", value: 3 },
          Dead: { label: "BITD.HarmDead", description: "BITD.HarmDeadDescription", value: 4 }
        })
      }),

      armor: new fields.BooleanField({ required: false, initial: false })
    };
  }

  /**
   * Ports blades-item.js#_prepareCohort(): default Scale/Quality come from the
   * owning actor's tier, but only while the matching *_override checkbox is
   * unset -- once the user overrides a value, leave it alone (the "editable
   * cohorts" feature).
   */
  prepareDerivedData() {
    const actor = this.parent?.actor ?? null;
    const tier = actor ? parseInt(actor.system?.tier) || 0 : 0;

    let scale = 0;
    let quality = 0;
    switch (this.cohort) {
      case "Gang":
        scale = tier;
        quality = tier;
        break;
      case "Expert":
        scale = 0;
        quality = tier + 1;
        break;
    }

    if (!this.scale_override) this.scale = scale;
    if (!this.quality_override) this.quality = quality;
  }
}
