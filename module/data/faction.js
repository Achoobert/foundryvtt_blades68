const { fields } = foundry.data;

/**
 * System DataModel for the Actor type "factions".
 *
 * This Actor type is a near-empty container/shell: it holds a list of
 * embedded Items of type "faction" (singular -- a different, unmigrated
 * Item type with its own sheet at templates/items/faction.html) and the
 * sheet just lists them with a status/hold tracker for each. All of the
 * real faction business data (tier, goals, turf, assets, allies/enemies,
 * status/hold values, etc.) lives on those embedded Items, not here --
 * see module/blades-item.js (type === "faction") and template.json's
 * Item.faction schema. A DataModel for that embedded Item type is a
 * separate migration and out of scope for this Actor DataModel.
 *
 * template.json's Actor.factions schema is just `{ "name": "" }` -- a
 * stub key that nothing in the codebase reads (grepped for
 * `system.name` across module/ and templates/: no hits). It's kept here,
 * unused, only so an existing Actor's stored data round-trips cleanly
 * instead of being silently dropped by DataModel validation.
 */
export class FactionData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      // Vestigial stub field carried over from template.json. Nothing in
      // the sheet, template, or actor document class reads or writes it.
      name: new fields.StringField({
        required: false,
        blank: true,
        initial: ""
      })
    };
  }

  // Nothing is derived on the Actor itself -- the legacy sheet's getData()
  // only ever computed `isGM`, a session/user property (game.user.isGM),
  // not actor data, so there is nothing to port into
  // prepareDerivedData() here.
}
