import { BladesSheetV2 } from "./blades-sheet-v2.js";

/**
 * Faction actor sheet ("factions" Actor type -- plural, do not confuse with
 * the singular embedded Item type "faction" which carries all the real
 * business data via its own separate BladesItemSheet).
 *
 * This actor is a near-empty container: system.* has no real fields of its
 * own (see module/data/faction.js). The whole sheet is a list of embedded
 * "faction" Items, each rendered with a status track and a hold track whose
 * radios write directly onto that embedded Item's system.status.value /
 * system.hold.value -- this is the one piece of custom behavior ported from
 * the legacy jQuery listener (BladesSheet._onUpdateBoxClick in
 * module/blades-sheet.js). Item add/open/delete/post are all covered by the
 * shared bid.itemAdd/itemOpen/itemDelete/itemPost actions on BladesSheetV2.
 */
export class BladesFactionSheet extends BladesSheetV2 {

  static DEFAULT_OPTIONS = {
    // BladesSheetV2's own classes list omits "blades68", which is the
    // class every rule in styles/blades.css is scoped under (".blades68
    // .label-stripe", ".blades68 .black-label", etc.) -- add it back here,
    // same as the legacy sheet's defaultOptions did, so this sheet keeps
    // its existing look.
    classes: [...super.DEFAULT_OPTIONS.classes, "blades68", "faction"],
    position: { width: 900, height: "auto" },
    actions: {
      "bid.updateBox": BladesFactionSheet._onUpdateBox
    }
  };

  static PARTS = {
    body: { template: "systems/blades68/templates/faction-sheet.html" }
  };

  /* -------------------------------------------- */

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    return {
      ...ctx,
      actor: this.actor,
      document: this.document,
      _id: this.actor.id,
      id: this.actor.id,
      name: this.actor.name,
      img: this.actor.img,
      system: this.actor.system,
      // Legacy getData() (via ActorSheet's base implementation) exposed
      // "items" as plain, already-serialized item data for the template to
      // iterate with {{#each items as |faction id|}} -- reproduce that
      // shape here rather than handing Handlebars live Documents.
      items: this.actor.items.map(i => i.toObject()),
      owner: this.actor.isOwner,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      isGM: game.user.isGM
    };
  }

  /* -------------------------------------------- */
  /*  Faction status / hold tracker                */
  /* -------------------------------------------- */

  /**
   * Port of BladesSheet._onUpdateBoxClick (module/blades-sheet.js) for the
   * status and hold radio tracks rendered per embedded "faction" Item.
   *
   * Preserves the legacy array/scalar asymmetry on purpose: status.value
   * and hold.value are stored as single-element arrays in template.json
   * (the shared "multiboxes" Handlebars helper reads them that way), but
   * every write here replaces that with a bare scalar -- exactly what the
   * legacy handler did. Do not "fix" this to write an array; other code
   * (the multiboxes helper's own single-value fallback) already tolerates
   * a bare scalar on read.
   *
   * The legacy handler also had a fallback that read a stray
   * `#fac-<type>-<id>` input's value when `data-value` was undefined.
   * Every radio in faction-sheet.html always sets data-value explicitly,
   * so that fallback is dead for this actor type and is not ported.
   */
  static async _onUpdateBox(event, target) {
    event.preventDefault();
    const itemId = target.dataset.item;
    const updateType = target.dataset.utype;
    const updateValue = target.dataset.value;
    if (!itemId || (updateType !== "status" && updateType !== "hold")) {
      console.log("bid.updateBox: missing item id or unrecognized utype", target.dataset);
      return;
    }
    const update = { _id: itemId, system: { [updateType]: { value: updateValue } } };
    await this.actor.updateEmbeddedDocuments("Item", [update]);
  }
}
