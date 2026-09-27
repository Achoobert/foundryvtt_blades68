const { fields } = foundry.data;

/**
 * Shared base + schema-fragment helpers for every Blades68 Item sub-type.
 *
 * template.json historically composed 15 distinct Item sub-types out of
 * Handlebars-style "templates" mixins (default / logic / ability /
 * activatedEffect). There is no automatic mixin composition for System
 * DataModels, so each concrete per-type class under module/data/items/<type>.js
 * spreads the schema fragments it needs directly into its own defineSchema().
 *
 * Two fragments below (`logicFields` and `activatedEffectFields`) are schema
 * for fields that are NOT rendered by any current V2 item template -- see the
 * per-type files for details -- but are kept verbatim so existing compendium
 * data / macros that might set them are not silently reset by strict
 * DataModel validation.
 */
export class BladesItemData extends foundry.abstract.TypeDataModel {
  /** Every Item type in this system carries at least a description. */
  static defaultFields() {
    return {
      description: new fields.HTMLField({ required: true, blank: true, initial: "" })
    };
  }

  /**
   * "logic" mixin -- system.logic is schema-present on ability/class/
   * crew_upgrade/item, but the matching <textarea> is commented out
   * (`<!-- -->`) in every legacy template. Dead UI, kept for compendium/macro
   * compatibility.
   */
  static logicFields() {
    return {
      logic: new fields.StringField({ required: false, blank: true, initial: "" })
    };
  }

  /**
   * "activatedEffect" mixin -- a full DND5e-style activation block that is
   * schema-present on 9 Item types in template.json but rendered by NONE of
   * the item templates. Kept (not dropped) in case something outside the
   * sheet layer reads it.
   */
  static activatedEffectFields() {
    return {
      activation: new fields.SchemaField({
        type: new fields.StringField({ required: false, blank: true, initial: "" }),
        cost: new fields.NumberField({ required: false, initial: 0 }),
        condition: new fields.StringField({ required: false, blank: true, initial: "" })
      }),
      duration: new fields.SchemaField({
        value: new fields.NumberField({ required: false, initial: null, nullable: true }),
        units: new fields.StringField({ required: false, blank: true, initial: "" })
      }),
      target: new fields.SchemaField({
        value: new fields.NumberField({ required: false, initial: null, nullable: true }),
        width: new fields.NumberField({ required: false, initial: null, nullable: true }),
        units: new fields.StringField({ required: false, blank: true, initial: "" }),
        type: new fields.StringField({ required: false, blank: true, initial: "" })
      }),
      range: new fields.SchemaField({
        value: new fields.NumberField({ required: false, initial: null, nullable: true }),
        long: new fields.NumberField({ required: false, initial: null, nullable: true }),
        units: new fields.StringField({ required: false, blank: true, initial: "" })
      }),
      uses: new fields.SchemaField({
        value: new fields.NumberField({ required: false, initial: 0 }),
        max: new fields.NumberField({ required: false, initial: 0 }),
        per: new fields.StringField({ required: false, blank: true, nullable: true, initial: null })
      }),
      consume: new fields.SchemaField({
        type: new fields.StringField({ required: false, blank: true, initial: "" }),
        target: new fields.StringField({ required: false, blank: true, nullable: true, initial: null }),
        amount: new fields.NumberField({ required: false, initial: null, nullable: true })
      })
    };
  }

  /**
   * "ability" mixin -- description + price/class/uses tracking shared by
   * ability, crew_ability and crew_upgrade. uses_used/purchased/class_default/
   * unlocked have no UI on this sheet (set programmatically elsewhere, e.g.
   * the character-sheet purchase flow) but must stay in schema.
   */
  static abilityFields() {
    return {
      ...BladesItemData.defaultFields(),
      class: new fields.StringField({ required: false, blank: true, initial: "" }),
      price: new fields.NumberField({ required: false, initial: 1 }),
      uses: new fields.NumberField({ required: false, initial: 0 }),
      uses_text: new fields.StringField({ required: false, blank: true, initial: "" }),
      uses_used: new fields.NumberField({ required: false, initial: 0 }),
      purchased: new fields.BooleanField({ required: false, initial: false }),
      class_default: new fields.BooleanField({ required: false, initial: false }),
      unlocked: new fields.NumberField({ required: false, initial: 0 })
    };
  }

  /** Build a lazily-created turf map { "1": {name,value,description,connects:[]}, ... }. */
  static turfsInitial(count, overrides = {}) {
    return () => {
      const turfs = {};
      for (let i = 1; i <= count; i++) {
        turfs[String(i)] = { name: "", value: "", description: "", connects: [] };
      }
      for (const [id, patch] of Object.entries(overrides)) {
        Object.assign(turfs[id], patch);
      }
      return turfs;
    };
  }

  /** Build a lazily-created turf-header map (crew_type's 4 paginated unlock headers). */
  static turfHeadersInitial(count) {
    return () => {
      const headers = {};
      for (let i = 1; i <= count; i++) {
        headers[String(i)] = {
          name: "", subheader: "", unlock: "", select: 0,
          options: [], selected: [], units: 0, value: false, units_filled: 0
        };
      }
      return headers;
    };
  }
}
