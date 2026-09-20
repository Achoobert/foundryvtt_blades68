import { BladesSheetV2 } from "./blades-sheet-v2.js";
import { enrichHTML } from "./compat.js";

/**
 * NPC actor sheet. Flat string bag (name/description/associations/notes) --
 * no clocks, no items, no active effects. Only custom behavior ported from
 * the legacy sheet is the enrichHTML pass over system.description for
 * display (secrets gated on ownership).
 */
export class BladesNPCSheet extends BladesSheetV2 {

  static DEFAULT_OPTIONS = {
    classes: [...super.DEFAULT_OPTIONS.classes, "npc"],
    position: { width: 510, height: "auto" }
  };

  static PARTS = {
    body: { template: "systems/blades68/templates/npc-sheet.html" }
  };

  /* -------------------------------------------- */

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const owner = this.actor.isOwner;

    // Overwrite the display copy only -- the underlying document field is
    // untouched, matching the legacy getData() behavior. The template's
    // description textarea renders this enriched string as its raw value,
    // same as it always has.
    const enrichedDescription = await enrichHTML(this.actor.system.description, {
      secrets: owner,
      async: true
    });

    return {
      ...ctx,
      actor: this.actor,
      document: this.document,
      _id: this.actor.id,
      id: this.actor.id,
      name: this.actor.name,
      img: this.actor.img,
      system: {
        ...this.actor.system.toObject(),
        description: enrichedDescription
      },
      owner,
      isGM: game.user.isGM,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked"
    };
  }
}
