import { BladesSheetV2 } from "./blades-sheet-v2.js";
import { BladesActiveEffect } from "./blades-active-effect.js";
import { BladesHelpers } from "./blades-helpers.js";
import { simpleRollPopup } from "./blades-roll.js";
import { openFormDialog } from "./lib/dialog-compat.js";

/**
 * Crew actor sheet. Field shapes and derived data (turfs_amount, scoundrel
 * defaults) live on CrewData (module/data/crew.js); this class only handles
 * rendering plus the type-specific interactions that don't fit the shared
 * item-CRUD / active-effect / radio-toggle plumbing on BladesSheetV2:
 * turf claims + turf headers on the owned crew_type/prison item, crew
 * upgrade/ability price pips, cohort harm, the manually-entered turf-claimed
 * count, acquaintance standing, and (world-setting gated) the XP clock.
 */
export class BladesCrewSheet extends BladesSheetV2 {

  static DEFAULT_OPTIONS = {
    classes: [...super.DEFAULT_OPTIONS.classes, "crew"],
    position: { width: 940, height: 940 },
    form: {
      handler: BladesCrewSheet._onSubmitForm,
      submitOnChange: true,
      closeOnSubmit: false
    },
    actions: {
      "bid.tabSelect":          BladesCrewSheet._onTabSelect,
      "bid.rollQuickPopup":     BladesCrewSheet._onRollQuickPopup,
      "bid.addCohort":          BladesCrewSheet._onAddCohort,
      "bid.turfClick":          BladesCrewSheet._onTurfClick,
      "bid.turfHeaderUnlock":   BladesCrewSheet._onTurfHeaderUnlock,
      "bid.turfHeaderUnit":     BladesCrewSheet._onTurfHeaderUnit,
      "bid.turfHeaderOption":   BladesCrewSheet._onTurfHeaderOption,
      "bid.crewUpgradePricePip": BladesCrewSheet._onCrewUpgradePricePip,
      "bid.cohortHarmSet":      BladesCrewSheet._onCohortHarmSet,
      "bid.turfClaimedEdit":    BladesCrewSheet._onTurfClaimedEdit,
      "bid.standingToggle":     BladesCrewSheet._onStandingToggle,
      "bid.openFriend":         BladesCrewSheet._onOpenFriend,
      "bid.acquaintanceDelete": BladesCrewSheet._onAcquaintanceDelete,
      "bid.importContacts":     BladesCrewSheet._onImportContacts,
      "bid.addCustomContact":   BladesCrewSheet._onAddCustomContact,
      "bid.expClockUp":         BladesCrewSheet._onExpClockUp,
      "bid.expClockDown":       BladesCrewSheet._onExpClockDown,
      "bid.addExpClock":        BladesCrewSheet._onAddExpClock,
      "bid.minusExpClock":      BladesCrewSheet._onMinusExpClock
    }
  };

  static PARTS = {
    body: { template: "systems/blades68/templates/crew-sheet.html" }
  };

  /* -------------------------------------------- */

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    this._activeTab ??= "turfs";

    // Gambit boxes are sized by a world setting, not per-crew data. Compute
    // and clamp here (sheet layer) rather than in CrewData -- game.settings
    // may not be safely readable inside DataModel prepare hooks in all
    // lifecycle stages.
    const gambitsMax = Number(game.settings.get("blades68", "GambitsMax")) || 0;
    const gambitsValue = Math.min(Math.max(Number(this.actor.system.gambits?.value) || 0, 0), gambitsMax);

    const system = {
      ...this.actor.system.toObject(),
      turfs_amount: this.actor.system.turfs_amount,
      gambits: { value: gambitsValue }
    };

    return {
      ...ctx,
      actor: this.actor,
      document: this.document,
      _id: this.actor.id,
      id: this.actor.id,
      name: this.actor.name,
      img: this.actor.img,
      items: this.actor.items.contents,
      system,
      gambits_max: gambitsMax,
      // i > max_rep - turfs_amount, restated as i >= threshold, matching the
      // legacy `repturf` Handlebars helper's grey-out-from-the-right math.
      repTurfThreshold: (Number(this.actor.system.max?.rep) || 0) - (Number(this.actor.system.turfs_amount) || 0) + 1,
      activeTab: this._activeTab,
      owner: this.actor.isOwner,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      isGM: game.user.isGM,
      effects: BladesActiveEffect.prepareActiveEffectCategories(this.actor.effects)
    };
  }

  /* -------------------------------------------- */
  /*  Item add (crew_type auto-contacts)           */
  /* -------------------------------------------- */

  // BladesSheetV2#_addItemsToSheet (shared by every actor type) doesn't know
  // about crew_type's playbook-contact generation -- that's crew-specific, so
  // it's layered on here rather than in the shared base class.
  async _addItemsToSheet(item_type, selections) {
    await super._addItemsToSheet(item_type, selections);
    if (item_type !== "crew_type") return;

    const items = await BladesHelpers.getAllItemsByType(item_type, game);
    let selectedIds = selections;
    if (!Array.isArray(selectedIds)) selectedIds = selectedIds ? [selectedIds] : [];
    const crewTypeName = selectedIds
      .map(id => items.find(e => e._id === id))
      .filter(Boolean)[0]?.name;
    if (!crewTypeName) return;

    try {
      await BladesHelpers.generateCrewTypeContacts(this.actor, crewTypeName);
    } catch (err) {
      console.error("Failed to generate crew type contacts", err);
      ui.notifications?.warn?.(
        `Crew type added, but contacts for ${crewTypeName} could not be generated.`
      );
    }
  }

  /* -------------------------------------------- */
  /*  Form submission                              */
  /* -------------------------------------------- */

  // Changing Tier changes derived dice/etc elsewhere on the sheet, so force a
  // full re-render -- mirrors the legacy _updateObject override exactly.
  static async _onSubmitForm(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    await this.actor.update(data);
    if (event?.target?.name === "system.tier") {
      this.render(true);
    }
  }

  /* -------------------------------------------- */
  /*  Drag & drop                                  */
  /* -------------------------------------------- */

  /** @override */
  async _onDropActor(event, data) {
    await super._onDropActor?.(event, data);
    if (!this.actor.isOwner) {
      ui.notifications.error(
        "You do not have sufficient permissions to edit this character. Please speak to your GM if you feel you have reached this message in error.",
        { permanent: true }
      );
      return false;
    }
    const droppedActor = await fromUuid(data.uuid);
    if (!droppedActor) return;
    // Only npc drops do anything; item/crew_type/ability/class drops are
    // explicit intentional no-ops here, same as the legacy handleDrop.
    if (droppedActor.type === "npc") {
      await BladesHelpers.addAcquaintance(this.actor, droppedActor);
    }
  }

  /* -------------------------------------------- */
  /*  Tabs                                         */
  /* -------------------------------------------- */

  // Self-managed tab state (rather than the ApplicationV2 TABS API) so the
  // existing .tab[data-tab].active / nav.tabs .item.active CSS -- unchanged
  // since the legacy AppV1 Tabs controller -- keeps working exactly as-is.
  static async _onTabSelect(event, target) {
    event.preventDefault();
    const tab = target.dataset.tab;
    if (!tab) return;
    this._activeTab = tab;
    this.render(false);
  }

  /* -------------------------------------------- */
  /*  Quick roll / cohort add                      */
  /* -------------------------------------------- */

  static async _onRollQuickPopup(event, target) {
    event.preventDefault();
    await simpleRollPopup();
  }

  // Cohorts are created blank (no item picker) -- mirrors
  // BladesHelpers._addOwnedItem exactly, just reading data-item-type off the
  // clicked V2 action target instead of a jQuery event.
  static async _onAddCohort(event, target) {
    event.preventDefault();
    const item_type = target.dataset.itemType || "cohort";
    await this.actor.createEmbeddedDocuments("Item", [{
      name: foundry.utils.randomID(),
      type: item_type
    }]);
  }

  /* -------------------------------------------- */
  /*  Turf claims (owned crew_type / prison item)  */
  /* -------------------------------------------- */

  // Toggle a non-base turf-block's claimed state. The base/lair claim tile
  // never gets this action bound to it (see template), so no "is base turf"
  // guard is needed here.
  static async _onTurfClick(event, target) {
    event.preventDefault();
    const itemId = BladesCrewSheet._itemIdFrom(target);
    const turfId = target.dataset.turfId;
    if (!itemId || turfId == null) return;
    const current = target.dataset.turfStatus === "true";
    await this.actor.updateEmbeddedDocuments("Item", [{
      _id: itemId,
      [`system.turfs.${turfId}.value`]: !current
    }]);
  }

  static async _onTurfHeaderUnlock(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = BladesCrewSheet._itemIdFrom(target);
    const headerId = target.dataset.headerId;
    if (!itemId || headerId == null) return;
    const item = this.actor.items.get(itemId);
    const current = item?.system?.turf_headers?.[headerId]?.value === true;
    await this.actor.updateEmbeddedDocuments("Item", [{
      _id: itemId,
      [`system.turf_headers.${headerId}.value`]: !current
    }]);
  }

  static async _onTurfHeaderUnit(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = BladesCrewSheet._itemIdFrom(target);
    const headerId = target.dataset.headerId;
    const unitIndex = Number(target.dataset.unitIndex);
    if (!itemId || headerId == null || !Number.isFinite(unitIndex)) return;
    const item = this.actor.items.get(itemId);
    const current = Number(item?.system?.turf_headers?.[headerId]?.units_filled ?? 0) || 0;
    const next = current === unitIndex ? 0 : unitIndex;
    await this.actor.updateEmbeddedDocuments("Item", [{
      _id: itemId,
      [`system.turf_headers.${headerId}.units_filled`]: next
    }]);
  }

  static async _onTurfHeaderOption(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = BladesCrewSheet._itemIdFrom(target);
    const headerId = target.dataset.headerId;
    const option = String(target.dataset.option ?? "");
    if (!itemId || headerId == null || !option) return;
    const item = this.actor.items.get(itemId);
    const header = item?.system?.turf_headers?.[headerId] ?? {};
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
    await this.actor.updateEmbeddedDocuments("Item", [{
      _id: itemId,
      [`system.turf_headers.${headerId}.selected`]: selected
    }]);
  }

  /* -------------------------------------------- */
  /*  Crew upgrades / abilities                    */
  /* -------------------------------------------- */

  // Shared by crew_upgrade and crew_ability items: click a pip to unlock up
  // through it, or click an already-unlocked pip to undo back to just before
  // it (cumulative dot track).
  static async _onCrewUpgradePricePip(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = target.dataset.itemId;
    const priceIndex = Number(target.dataset.priceIndex);
    if (!itemId || !Number.isFinite(priceIndex)) return;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    const current = Number(item.system?.unlocked ?? 0) || 0;
    const next = priceIndex <= current ? priceIndex - 1 : priceIndex;
    await item.update({ "system.unlocked": next });
  }

  /* -------------------------------------------- */
  /*  Cohorts                                      */
  /* -------------------------------------------- */

  // Harm is written as an array-wrapped single value (system.harm = [id]) --
  // other code may depend on that exact shape, preserve it.
  static async _onCohortHarmSet(event, target) {
    const itemId = BladesCrewSheet._itemIdFrom(target);
    const harmId = target.value;
    if (!itemId) return;
    await this.actor.updateEmbeddedDocuments("Item", [{
      _id: itemId,
      "system.harm": [harmId]
    }]);
  }

  /* -------------------------------------------- */
  /*  Turf claimed (manual entry)                  */
  /* -------------------------------------------- */

  static async _onTurfClaimedEdit(event, target) {
    event.preventDefault();
    const maxRep = Number(this.actor.system.max?.rep) || 0;
    const current = Number(this.actor.system.turf?.claimed) || 0;

    const content = `
      <form>
        <div class="form-group">
          <label>${game.i18n.localize("BITD.TurfClaimedLabel")}</label>
          <input type="number" name="turf_claimed" value="${current}" min="0" max="${maxRep}" step="1" autofocus>
        </div>
      </form>
    `;

    const formResult = await openFormDialog({
      title: game.i18n.localize("BITD.TurfClaimedDialogTitle"),
      content,
      okLabel: game.i18n.localize("Save"),
      cancelLabel: game.i18n.localize("Cancel")
    });

    if (!formResult) return;

    let value = Number(formResult.turf_claimed);
    if (!Number.isFinite(value)) value = 0;
    value = Math.min(Math.max(value, 0), maxRep);

    await this.actor.update({ "system.turf.claimed": value });
  }

  /* -------------------------------------------- */
  /*  Acquaintances / contacts                     */
  /* -------------------------------------------- */

  static async _onStandingToggle(event, target) {
    const acqId = target.closest(".acquaintance")?.dataset.acquaintance;
    if (!acqId) return;
    const acquaintances = foundry.utils.deepClone(this.actor.system.acquaintances ?? []);
    const idx = acquaintances.findIndex(a => a.id == acqId);
    if (idx < 0) return;
    const order = { friend: "rival", rival: "neutral", neutral: "friend" };
    acquaintances[idx].standing = order[acquaintances[idx].standing] ?? "neutral";
    await this.actor.update({ system: { acquaintances } });
  }

  static async _onOpenFriend(event, target) {
    const itemId = BladesCrewSheet._itemIdFrom(target);
    if (!itemId) return;
    const linked = game.actors.get(itemId);
    if (linked) {
      linked.sheet.render(true);
    } else {
      await BladesHelpers.importAcquaintance(this.actor, itemId);
    }
  }

  static async _onAcquaintanceDelete(event, target) {
    const itemId = BladesCrewSheet._itemIdFrom(target);
    if (!itemId) return;
    await BladesHelpers.removeAcquaintance(this.actor, itemId);
  }

  static async _onImportContacts(event, target) {
    const playbook = this.actor.items.find(i => i.type === "crew_type")?.name;
    await BladesHelpers.import_pb_contacts(this.actor, playbook);
  }

  static async _onAddCustomContact(event, target) {
    await BladesHelpers.addCustomContact(this.actor);
  }

  /* -------------------------------------------- */
  /*  XP clock (world setting ClockXP)             */
  /* -------------------------------------------- */

  static async _onExpClockUp(event, target) {
    let { value, number, size } = this.actor.system.exp_clock;
    value = value + 1;
    if (value >= size) {
      value = 0;
      number = number + 1;
    }
    await this.actor.update({ "system.exp_clock": { value, number } });
  }

  static async _onExpClockDown(event, target) {
    let { value, number, size } = this.actor.system.exp_clock;
    value = value - 1;
    if (value < 0) {
      value = size - 1;
      number = number - 1;
    }
    await this.actor.update({ "system.exp_clock": { value, number } });
  }

  static async _onAddExpClock(event, target) {
    const number = this.actor.system.exp_clock.number + 1;
    await this.actor.update({ "system.exp_clock": { number } });
  }

  static async _onMinusExpClock(event, target) {
    const number = Math.max(this.actor.system.exp_clock.number - 1, 0);
    await this.actor.update({ "system.exp_clock": { number } });
  }
}
