const { fields } = foundry.data;

/**
 * NPC actor type: flat bag of string fields, no clocks/tracks/items.
 * Kept 1:1 with template.json Actor.types.npc.
 */
export class NPCData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      // Redundant with Actor#name (unused in the template, which only binds
      // top-level {{name}}) but kept for back-compat with existing data.
      name: new fields.StringField({ required: true, initial: "", blank: true }),
      description_short: new fields.StringField({ required: true, initial: "", blank: true }),
      description: new fields.StringField({ required: true, initial: "", blank: true }),
      associated_class: new fields.StringField({ required: true, initial: "", blank: true }),
      associated_faction: new fields.StringField({ required: true, initial: "", blank: true }),
      associated_crew_type: new fields.StringField({ required: true, initial: "", blank: true }),
      notes: new fields.StringField({ required: true, initial: "", blank: true })
    };
  }
}
