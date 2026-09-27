const { fields } = foundry.data;

/**
 * Crew actor type: reputation/coins/heat/wanted/tier tracks, turf claim,
 * acquaintances, and the scoundrel bonus block that transferred Active
 * Effects from crew_upgrade items write into.
 *
 * NOTE on tracker fields (reputation/experience/heat/wanted/hold/coins.value/
 * vault.value/gambits.value): template.json historically declared several of
 * these as single-element arrays (e.g. `"reputation": [0]`), but that is only
 * ever the as-authored *default* under the old non-DataModel template system,
 * which never enforced it. Real saved actors store scalars once a dot-tracker
 * radio has ever been changed (verified against
 * yml_source/blades68/blades_68_content/blades68_example_characters/example_crew.yml,
 * which has "hold": "weak", "experience": "6", "coins": {"value": "2"}, etc).
 * These are declared as plain Number/StringField here to match real runtime
 * shape; NumberField/StringField both cast a legacy single-element array
 * default (e.g. `[0]`) down to the scalar correctly (`Number([0]) === 0`,
 * `String(["strong"]) === "strong"`), so old actors migrate cleanly. Do NOT
 * change these to ArrayField -- an ArrayField would iterate a *string* value
 * character-by-character (`Array.from("12")` -> `["1","2"]`), silently
 * corrupting any multi-digit tracker value (rep goes up to 12, heat to 9+).
 */
export class CrewData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      // Redundant with Actor#name (unused in the template, which only binds
      // top-level {{name}}) but kept for back-compat with existing data.
      name: new fields.StringField({ required: true, initial: "", blank: true }),

      // Not present in template.json but real saved crew actors carry this
      // (Notes tab textarea binds system.description directly on the actor,
      // not on an item) -- see example_crew.yml. Kept for back-compat.
      description: new fields.StringField({ required: true, initial: "", blank: true }),

      reputation: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),
      lair: new fields.StringField({ required: true, initial: "", blank: true }),
      tier: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),

      // Present in template.json, not referenced anywhere in
      // blades-crew-sheet.js/crew-sheet.html -- vestigial, kept for back-compat
      // in case an Active Effect or external tool targets it by string key.
      deity: new fields.StringField({ required: true, initial: "", blank: true }),

      rep2: new fields.SchemaField({
        value: new fields.StringField({ required: true, initial: "", blank: true }),
        visible: new fields.BooleanField({ required: true, initial: false }),
        label: new fields.StringField({ required: true, initial: "BITD.Description", blank: true })
      }),

      hold: new fields.StringField({
        required: true,
        initial: "strong",
        blank: false,
        choices: ["weak", "strong"]
      }),

      experience: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),

      exp_clock: new fields.SchemaField({
        value: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),
        number: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),
        size: new fields.NumberField({ required: true, initial: 6, min: 1, integer: true }),
        color: new fields.StringField({ required: true, initial: "black", blank: false })
      }),

      // Option list for the Hold radio -- not itself rendered as an input value.
      hold_types: new fields.ArrayField(
        new fields.StringField({ required: true, blank: false }),
        { required: true, initial: ["weak", "strong"] }
      ),

      coins: new fields.SchemaField({
        max: new fields.NumberField({ required: true, initial: 4, min: 0, integer: true }),
        value: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true })
      }),

      vault: new fields.SchemaField({
        value: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),
        max: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true })
      }),

      // gambits.max is NOT here -- it lives in the world setting
      // `blades68.GambitsMax`, computed sheet-side every render (see
      // BladesCrewSheet#_prepareContext). Do not add a max here.
      gambits: new fields.SchemaField({
        value: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true })
      }),

      turf: new fields.SchemaField({
        // Free-text turf claim descriptions; not referenced in
        // blades-crew-sheet.js/crew-sheet.html today, kept for back-compat.
        descriptions: new fields.ArrayField(new fields.StringField({ blank: true }), { required: true, initial: [] }),
        max: new fields.NumberField({ required: true, initial: 6, min: 0, integer: true }),
        // Present in template.json, not read/written anywhere in
        // blades-crew-sheet.js/crew-sheet.html -- vestigial, kept for back-compat.
        bonus: new fields.NumberField({ required: true, initial: 0, integer: true }),
        // Deliberate blades68 house rule: turf claimed is a MANUALLY entered
        // count (via the Turf label / bid.turfClaimedEdit dialog), not derived
        // from owned turf items. Do not "fix" this to auto-calculate.
        claimed: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true })
      }),

      // Present in template.json, not referenced anywhere in
      // blades-crew-sheet.js/crew-sheet.html -- vestigial, kept for back-compat.
      features: new fields.ArrayField(new fields.ObjectField(), { required: true, initial: [] }),

      heat: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),
      wanted: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),

      // Plain array of plain objects stored directly on the actor (NOT owned
      // Items). Element shape must stay exactly {id, name, standing,
      // description_short, type} or BladesHelpers.addAcquaintance /
      // removeAcquaintance / standing-toggle will silently drop fields on the
      // next actor.update.
      acquaintances: new fields.ArrayField(
        new fields.SchemaField({
          id: new fields.StringField({ required: true, initial: "", blank: true }),
          name: new fields.StringField({ required: true, initial: "", blank: true }),
          standing: new fields.StringField({
            required: true,
            initial: "neutral",
            blank: false,
            choices: ["friend", "rival", "neutral"]
          }),
          description_short: new fields.StringField({ required: true, initial: "", blank: true }),
          // Not populated by BladesHelpers.addAcquaintance/addCustomContact today,
          // but kept in the element schema so it round-trips if ever set.
          type: new fields.StringField({ required: true, initial: "", blank: true })
        }),
        { required: true, initial: [] }
      ),

      // Not directly rendered in crew-sheet.html -- the tab/section label is a
      // hardcoded localize("BITD.Contacts") instead. Kept for back-compat.
      acquaintances_label: new fields.StringField({ required: true, initial: "BITD.Contacts", blank: true }),

      // Present in template.json, but hunting grounds are actually rendered
      // via owned Items of type hunting_grounds (iterated from `items`), not
      // from this array -- vestigial, kept for back-compat.
      hunting_grounds: new fields.ArrayField(new fields.ObjectField(), { required: true, initial: [] }),

      // Rendered via {{system.hunting_grounds_label}} as the localize KEY
      // itself (double-localization) -- see crew-sheet.html.
      hunting_grounds_label: new fields.StringField({ required: true, initial: "BITD.HuntingGrounds", blank: true }),

      // Target of transferred Active Effects from owned crew_upgrade items;
      // read by linked character actors (blades-actor.js
      // applyCrewStressBonus/applyCrewTraumaBonus/isCrewMastery/crew bonus
      // keys). Schema only supplies defaults -- prepareDerivedData must NEVER
      // reassign these, or it would run after/interfere with Active Effect
      // application and wipe the bonuses off.
      scoundrel: new fields.SchemaField({
        add_trauma: new fields.NumberField({ required: true, initial: 0, integer: true }),
        add_stress: new fields.NumberField({ required: true, initial: 0, integer: true }),
        mastery: new fields.BooleanField({ required: true, initial: false }),
        bonus_keys: new fields.NumberField({ required: true, initial: 0, integer: true })
      }),

      max: new fields.SchemaField({
        heat: new fields.NumberField({ required: true, initial: 9, min: 0, integer: true }),
        tier: new fields.NumberField({ required: true, initial: 4, min: 0, integer: true }),
        wanted: new fields.NumberField({ required: true, initial: 4, min: 0, integer: true }),
        rep: new fields.NumberField({ required: true, initial: 12, min: 0, integer: true }),
        exp: new fields.NumberField({ required: true, initial: 10, min: 0, integer: true })
      })
    };
  }

  /**
   * Mirrors the legacy getData() mutation: turf.claimed is manually entered
   * (see bid.turfClaimedEdit) and clamped into [0, turf.max] for display --
   * used by the reputation tracker to grey out that many pips from the right.
   * Safe to compute here (doesn't depend on any world setting).
   */
  prepareDerivedData() {
    const claimed = Number(this.turf?.claimed) || 0;
    const max = Number(this.turf?.max) || 0;
    this.turfs_amount = Math.min(Math.max(claimed, 0), max);
  }
}
