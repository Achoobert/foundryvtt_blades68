import { BladesSheet } from "./blades-sheet.js";
import { BladesActiveEffect } from "./blades-active-effect.js";
import { BladesHelpers } from "./blades-helpers.js";
import { simpleRollPopup } from "./blades-roll.js";
import { openFormDialog } from "./lib/dialog-compat.js";

/**
 * @extends {BladesSheet}
 */
export class BladesCrewSheet extends BladesSheet {

  /** @override */
	static get defaultOptions() {
	  return foundry.utils.mergeObject(super.defaultOptions, {
  	  classes: ["blades68", "sheet", "actor", "crew"],
  	  template: "systems/blades68/templates/crew-sheet.html",
      width: 940,
      height: 940,
      tabs: [{navSelector: ".tabs", contentSelector: ".tab-content", initial: "turfs"}]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    const superData = await super.getData( options );
    const sheetData = superData.data;
    sheetData.owner = superData.owner;
    sheetData.editable = superData.editable;
    sheetData.isGM = game.user.isGM;
	
    // Prepare active effects
    sheetData.effects = BladesActiveEffect.prepareActiveEffectCategories(this.actor.effects);

    // Turf claimed is a manually-entered value (set via the Turf label on the
    // Rep tracker) - no auto-calculation from owned turf items.
    let turfs_claimed = Number(sheetData.system.turf.claimed) || 0;
    let turfs_max = sheetData.system.turf.max;
    if (turfs_claimed > turfs_max) { turfs_claimed = turfs_max; }
    if (turfs_claimed < 0) { turfs_claimed = 0; }
    sheetData.system.turfs_amount = turfs_claimed;

    // Gambit boxes are sized by a world setting, not per-crew data.
    const gambits_max = Number(game.settings.get("blades68", "GambitsMax")) || 0;
    const gambits_value = Number(sheetData.system.gambits?.value) || 0;
    sheetData.gambits_max = gambits_max;
    sheetData.system.gambits = {
      ...sheetData.system.gambits,
      value: Math.min(Math.max(gambits_value, 0), gambits_max)
    };

	//return data
    return sheetData;
	
  }
  
  /** @override **/
  async _onDropActor(event, droppedActor){
    await super._onDropActor(event, droppedActor);
    if (!this.actor.isOwner) {
      ui.notifications.error(`You do not have sufficient permissions to edit this character. Please speak to your GM if you feel you have reached this message in error.`, {permanent: true});
      return false;
    }
    await this.handleDrop(event, droppedActor);
  }  
  
  /** @override **/
  async handleDrop(event, droppedEntity){
    let droppedEntityFull = await fromUuid(droppedEntity.uuid);
    switch (droppedEntityFull.type) {
      case "npc":
        await BladesHelpers.addAcquaintance(this.actor, droppedEntityFull);
        break;
      case "item":
        break;
      case "crew_type":
        break;
      case "ability":
        break;
      case "class":
        break ;
      default:
        break;
    }
  }
  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    html.find('.roll-quick-popup').click(async () => {
      await simpleRollPopup();
    });

    // Add Crew Type
    html.find(".crew-class").click(this._onItemAddClick.bind(this));

    // Add a new Cohort
    html.find('.add-item').click(ev => {
      BladesHelpers._addOwnedItem(ev, this.actor);
    });

    // Toggle Turf by clicking the block. The base / lair claim is always owned.
    html.find('.turf-list.section-non-editable .turf-block:not(.turf-base)').click(async ev => {
      const element = $(ev.currentTarget).parents(".item");

      let item_id = element.data("itemId")
      let turf_id = $(ev.currentTarget).data("turfId");
      let turf_current_status = $(ev.currentTarget).data("turfStatus");
      let turf_checkbox_name = 'system.turfs.' + turf_id + '.value';

      await this.actor.updateEmbeddedDocuments('Item', [{
        _id: item_id,
        [turf_checkbox_name]: !turf_current_status}]);
      this.render(false);
    });

    // Turf row header: unlock circle
    html.find('.turf-header-unlock').click(async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const target = $(ev.currentTarget);
      const item = target.parents(".item");
      const item_id = item.data("itemId");
      const header_id = target.data("headerId");
      if (!item_id || header_id == null) return;

      const embed = this.actor.items.get(item_id);
      const current = embed?.system?.turf_headers?.[header_id]?.value === true;
      await this.actor.updateEmbeddedDocuments('Item', [{
        _id: item_id,
        [`system.turf_headers.${header_id}.value`]: !current
      }]);
      this.render(false);
    });

    // Turf row header: units dots (Dealers)
    html.find('.turf-header-unit').click(async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const target = $(ev.currentTarget);
      const item = target.parents(".item");
      const item_id = item.data("itemId");
      const header_id = target.data("headerId");
      const unit_index = Number(target.data("unitIndex"));
      if (!item_id || header_id == null || !Number.isFinite(unit_index)) return;

      const embed = this.actor.items.get(item_id);
      const current = Number(embed?.system?.turf_headers?.[header_id]?.units_filled ?? 0) || 0;
      const next = current === unit_index ? 0 : unit_index;
      await this.actor.updateEmbeddedDocuments('Item', [{
        _id: item_id,
        [`system.turf_headers.${header_id}.units_filled`]: next
      }]);
      this.render(false);
    });

    // Crew Upgrade price pips: click a pip to unlock up through it, or click an
    // already-unlocked pip to undo back to just before it (cumulative dot track).
    html.find('.crew-upgrade-price-pip').click(async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const target = $(ev.currentTarget);
      const item_id = target.data("itemId");
      const price_index = Number(target.data("priceIndex"));
      if (!item_id || !Number.isFinite(price_index)) return;

      const item = this.actor.items.get(item_id);
      const current = Number(item?.system?.unlocked ?? 0) || 0;
      const next = price_index <= current ? price_index - 1 : price_index;
      await item.update({ "system.unlocked": next });
      this.render(false);
    });

    // Turf row header: Utopians Vision word select (persist bold)
    html.find('.turf-header-option').click(async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const target = $(ev.currentTarget);
      const item = target.parents(".item");
      const item_id = item.data("itemId");
      const header_id = target.data("headerId");
      const option = String(target.data("option") ?? "");
      if (!item_id || header_id == null || !option) return;

      const embed = this.actor.items.get(item_id);
      const header = embed?.system?.turf_headers?.[header_id] ?? {};
      const max = Number(header.select ?? 0) || 0;
      const selected = Array.isArray(header.selected) ? [...header.selected] : [];
      const idx = selected.indexOf(option);
      if (idx >= 0) {
        selected.splice(idx, 1);
      } else if (selected.length < max) {
        selected.push(option);
      } else {
        return;
      }

      await this.actor.updateEmbeddedDocuments('Item', [{
        _id: item_id,
        [`system.turf_headers.${header_id}.selected`]: selected
      }]);
      this.render(false);
    });

    // Cohort Block Harm handler
    html.find('.cohort-block-harm input[type="radio"]').change( async ev => {
      const element = $(ev.currentTarget).parents(".item");

      let item_id = element.data("itemId")
      let harm_id = $(ev.currentTarget).val();

      await this.actor.updateEmbeddedDocuments('Item', [{
        _id: item_id,
        "system.harm": [harm_id]}]);
      this.render(false);
    });

    // Add custom contact
    html.find('.add-custom-contact').click(() => {
      BladesHelpers.addCustomContact(this.actor);
    });

    // Set Turf Claimed. Manually entered - not auto-calculated from owned
    // turf items. Greys out that many pips on the Rep tracker from the right.
    html.find('.turf-claimed-label').click(async () => {
      const max_rep = Number(this.actor.system.max?.rep) || 0;
      const current = Number(this.actor.system.turf?.claimed) || 0;

      const content = `
        <form>
          <div class="form-group">
            <label>${game.i18n.localize('BITD.TurfClaimedLabel')}</label>
            <input type="number" name="turf_claimed" value="${current}" min="0" max="${max_rep}" step="1" autofocus>
          </div>
        </form>
      `;

      const formResult = await openFormDialog({
        title: game.i18n.localize('BITD.TurfClaimedDialogTitle'),
        content,
        okLabel: game.i18n.localize('Save'),
        cancelLabel: game.i18n.localize('Cancel'),
      });

      if (!formResult) return;

      let value = Number(formResult.turf_claimed);
      if (!Number.isFinite(value)) value = 0;
      value = Math.min(Math.max(value, 0), max_rep);

      await this.actor.update({ "system.turf.claimed": value });
    });

  }


  /* -------------------------------------------- */
  /*  Form Submission                             */
	/* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {

    // Update the Item
    await super._updateObject(event, formData);

    if (event.target && event.target.name === "system.tier") {
      this.render(true);
    }
  }
  /* -------------------------------------------- */

}
