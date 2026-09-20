import { BladesSheetV2 } from "./blades-sheet-v2.js";
import { BladesActiveEffect } from "./blades-active-effect.js";
import { BladesHelpers } from "./blades-helpers.js";
import { enrichHTML } from "./compat.js";

/**
 * Maps an equipped class Item's display name to the key used both by
 * templates/parts/unique-data.html's per-playbook blocks and by
 * CharacterData's `unique-data` schema. "Time Traveler Future" and
 * "Time Traveler Past" are two distinct class Items that both drive the
 * same `time_traveler` unique-data block.
 */
const PLAYBOOK_UNIQUE = {
  "Hound": "hound",
  "Hull": "hull",
  "Intellectual": "intellectual",
  "Operative": "operative",
  "Paranormalist": "paranormalist",
  "Radical": "radical",
  "Swinger": "swinger",
  "Veteran": "veteran",
  "Vampire": "vampire",
  "Time Traveler Future": "time_traveler",
  "Time Traveler Past": "time_traveler"
};

/**
 * Character actor sheet. Field shapes and the bulk of the cross-Crew derived
 * math (stress/trauma max, healing minimum, Key slot count/list, Mastery
 * skill-max bump, loadout/encumbrance) live on CharacterData
 * (module/data/character.js) and on BladesActor's existing methods, which
 * this class simply reads. What's left here is everything that needs owned
 * Items / the compendium / async enrichment at render time (the class/
 * ability/item catalogs, the playbook-unique block, description enrichment),
 * plus every custom interaction the legacy jQuery listeners in
 * module/blades-sheet.js and module/blades-actor-sheet.js covered that
 * BladesSheetV2's shared item-CRUD / active-effect / radio-toggle plumbing
 * doesn't: Keys/deadlocks, acquaintance standing + custom contacts, the
 * class/ability/item checklist catalogs, per-item use/equip/bonus tracking,
 * and the ClockXP experience clock.
 */
export class BladesActorSheet extends BladesSheetV2 {

  static DEFAULT_OPTIONS = {
    // BladesSheetV2's own classes list omits "blades68", the class every
    // rule in styles/blades.css is scoped under -- add it back plus "pc",
    // same as the legacy sheet's defaultOptions did, so this sheet keeps
    // its existing look.
    classes: [...super.DEFAULT_OPTIONS.classes, "blades68", "pc"],
    position: { width: 790, height: 890 },
    actions: {
      "bid.rollAttribute":      BladesActorSheet._onRollAttribute,
      "bid.standingToggle":     BladesActorSheet._onStandingToggle,
      "bid.openFriend":         BladesActorSheet._onOpenFriend,
      "bid.acquaintanceDelete": BladesActorSheet._onAcquaintanceDelete,
      "bid.importContacts":     BladesActorSheet._onImportContacts,
      "bid.addCustomContact":   BladesActorSheet._onAddCustomContact,
      "bid.crewDelete":         BladesActorSheet._onCrewDelete,
      "bid.addKeyPopup":        BladesActorSheet._onAddKeyPopup,
      "bid.keyBoomToggle":      BladesActorSheet._onKeyBoomToggle,
      "bid.catalogToggle":      BladesActorSheet._onCatalogToggle,
      "bid.itemEquippedToggle": BladesActorSheet._onItemEquippedToggle,
      "bid.itemUseToggle":      BladesActorSheet._onItemUseToggle,
      "bid.itemBonusToggle":    BladesActorSheet._onItemBonusToggle,
      "bid.abilityUsesToggle":  BladesActorSheet._onAbilityUsesToggle,
      "bid.otherItemDelete":    BladesActorSheet._onOtherItemDelete,
      "bid.expClockUp":         BladesActorSheet._onExpClockUp,
      "bid.expClockDown":       BladesActorSheet._onExpClockDown,
      "bid.addExpClock":        BladesActorSheet._onAddExpClock,
      "bid.minusExpClock":      BladesActorSheet._onMinusExpClock
    }
  };

  static PARTS = {
    body: { template: "systems/blades68/templates/actor-sheet.html" }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "character-notes" },
        { id: "effects" },
        { id: "all-character-items" }
      ],
      initial: "character-notes"
    }
  };

  /* -------------------------------------------- */
  /*  Context                                      */
  /* -------------------------------------------- */

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const owner = this.actor.isOwner;

    const selectedClass = this.actor.items.find(i => i.type === "class") ?? null;
    const playbookUnique = selectedClass ? (PLAYBOOK_UNIQUE[selectedClass.name] ?? null) : null;

    // Special Abilities: only what the actor actually owns, regardless of class --
    // the full class ability catalog is no longer shown as an inline checklist (use
    // the "Add Ability" compendium picker instead). Abilities with uses > 0 get
    // per-use tracking checkboxes inline on the name line.
    const ownedAbilities = this.actor.items.filter(i => i.type === "ability");
    const otherAbilities = ownedAbilities.map(i => {
      const usesMax = Math.max(0, parseInt(i.system?.uses) || 0);
      const usesUsed = Math.max(0, parseInt(i.system?.uses_used) || 0);
      const usesText = (i.system?.uses_text || "").trim();
      return {
        _id: i.id,
        name: i.name,
        system: i.system,
        description: BladesHelpers.stripHtml(i.system?.description || ""),
        usesMax,
        usesUsed,
        usesText,
        usesIndexes: Array.from({ length: usesMax }, (_, idx) => idx + 1)
      };
    });
    const abilityShortList = ownedAbilities
      .map(i => BladesHelpers.trimClassFromName(i.name))
      .join(" - ");

    const itemResult = await this._buildCatalog("item", selectedClass, { slotsField: "num_available" });
    const itemCatalog = itemResult.catalog;
    // Other Items: the first checkbox marks the item as equipped/carried (and is what
    // counts against Load); if the item has more than one use (e.g. a gun with 3 shots),
    // up to 2 additional checkboxes track uses spent, independent of Load. An item with
    // num_available > 1 (e.g. carrying a second copy) also gets a bonus checkbox that
    // counts its Load a second time, independent of the main equip/use boxes.
    const otherItems = itemResult.other.map(i => {
      const usesMax = parseInt(i.system?.uses) || 1;
      const numAvailable = Math.max(1, parseInt(i.system?.num_available) || 1);
      const loadValue = Math.max(0, parseInt(i.system?.load) || 0);
      return {
        _id: i.id,
        name: i.name,
        system: i.system,
        description: BladesHelpers.stripHtml(i.system?.description || ""),
        extraUseIndexes: Array.from({ length: usesMax - 1 }, (_, idx) => idx + 1),
        usesSpent: Math.max(0, parseInt(i.system?.uses_used) || 0),
        hasBonus: numAvailable > 1,
        bonusLabel: `x${numAvailable}`,
        loadIndexes: Array.from({ length: loadValue }, (_, idx) => idx + 1),
        hasNoLoad: loadValue === 0
      };
    });

    let deepCutLoad = false;
    try {
      deepCutLoad = Boolean(game.settings.get("blades68", "DeepCutLoad"));
    } catch (err) {
      deepCutLoad = false;
    }
    const load_levels = deepCutLoad
      ? { "BITD.Discreet": "BITD.Discreet", "BITD.Conspicuous": "BITD.Conspicuous" }
      : { "BITD.Light": "BITD.Light", "BITD.Normal": "BITD.Normal", "BITD.Heavy": "BITD.Heavy" };

    const description = await enrichHTML(this.actor.system.description, {
      secrets: owner,
      async: true
    });

    let blades68Mode = false;
    let showKeys = false;
    try { blades68Mode = Boolean(game.settings.get("blades68", "Blades68Mode")); } catch (err) { /* not registered yet */ }
    try { showKeys = Boolean(game.settings.get("blades68", "ShowKeys")); } catch (err) { /* not registered yet */ }

    // Shallow-spread the *live* system DataModel (not .toObject(), which would
    // serialize back to raw source and drop everything CharacterData's
    // prepareDerivedData() just overlaid -- loadout, load_level, the
    // Mastery-adjusted attributes, crew-bonused stress/trauma/keys max, and
    // each Key slot's computed deadlockOptions) then layer the two purely
    // view-side, non-persisted extras on top, same as the legacy getData().
    const system = {
      ...this.actor.system,
      load_levels,
      description
    };

    return {
      ...ctx,
      actor: this.actor,
      document: this.document,
      _id: this.actor.id,
      id: this.actor.id,
      name: this.actor.name,
      img: this.actor.img,
      items: this.actor.items.map(i => i.toObject()),
      system,
      owner,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      isGM: game.user.isGM,
      effects: BladesActiveEffect.prepareActiveEffectCategories(this.actor.effects),
      blades68: blades68Mode,
      showKeys,
      blades68Keys: game.system.blades68Keys,
      selectedClass: selectedClass ? selectedClass.toObject() : null,
      playbookUnique,
      otherAbilities,
      abilityShortList,
      itemCatalog,
      otherItems
    };
  }

  /* -------------------------------------------- */
  /*  Post-render wiring for elements the V2       */
  /*  actions API can't cover (native "change" on  */
  /*  <select>, and multi-value radio groups)      */
  /* -------------------------------------------- */

  async _onRender(context, options) {
    await super._onRender(context, options);

    // Key select / deadlock-target select: plain "change" listeners, same as
    // the legacy jQuery .on('change', ...) binding. Deliberately NOT bound
    // via name="system.keys.list.N.key" -- see _prepareSubmitData() below for
    // why any system.keys.* form field would corrupt sibling Key slots.
    this.element.querySelectorAll(".key-select").forEach((el) => {
      el.addEventListener("change", (ev) => this._updateKeySlotField(ev, "key", ev.currentTarget.value));
    });
    this.element.querySelectorAll(".deadlocked-to-select").forEach((el) => {
      el.addEventListener("change", (ev) => this._updateKeySlotField(ev, "deadlocked_to", ev.currentTarget.value));
    });
    // Key XP marks: a genuine radio group (pick any value, not a cumulative
    // dot-fill), so this uses native "change" semantics rather than the
    // bid.radioToggle cycling widget.
    this.element.querySelectorAll('.key-marks input[type="radio"]').forEach((el) => {
      el.addEventListener("change", (ev) => {
        if (!ev.currentTarget.checked) return;
        this._updateKeySlotField(ev, "experience", Number(ev.currentTarget.value));
      });
    });
  }

  /* -------------------------------------------- */
  /*  Catalog helper (shared: class ability/item   */
  /*  checklists)                                  */
  /* -------------------------------------------- */

  /**
   * Builds a checklist catalog for the actor's equipped class: every item of the given type
   * tagged with that class's name, merged with the actor's owned items of that type to
   * determine how many of each are already carried. Owned items that don't belong to the
   * catalog (e.g. a Veteran pick from another class, or homebrew additions) are returned
   * separately so nothing owned is ever hidden.
   *
   * @param {string} itemType - "ability" or "item"
   * @param {Item|null} selectedClass
   * @param {{slotsField?: string}} [options]
   * @returns {Promise<{catalog: Array, other: Array}>}
   */
  async _buildCatalog(itemType, selectedClass, { slotsField } = {}) {
    const owned = this.actor.items.filter(i => i.type === itemType);

    if (!selectedClass) {
      return { catalog: [], other: owned };
    }

    const allSource = await BladesHelpers.getAllItemsByType(itemType);
    const className = selectedClass.name;

    const seen = new Set();
    const catalog = [];
    for (const source of allSource) {
      if ((source.system?.class || "") !== className) continue;
      const displayName = BladesHelpers.trimClassFromName(source.name);
      if (seen.has(displayName)) continue;
      seen.add(displayName);

      const slots = slotsField ? Math.max(1, parseInt(source.system?.[slotsField]) || 1) : 1;
      const ownedMatches = owned.filter(i => BladesHelpers.trimClassFromName(i.name) === displayName);
      const loadValue = Math.max(0, parseInt(source.system?.load) || 0);
      catalog.push({
        id: source.id,
        name: displayName,
        description: BladesHelpers.stripHtml(source.system?.description || ""),
        slots,
        slotIndexes: Array.from({ length: slots }, (_, i) => i + 1),
        ownedCount: ownedMatches.length,
        loadIndexes: Array.from({ length: loadValue }, (_, i) => i + 1),
        hasNoLoad: loadValue === 0
      });
    }
    catalog.sort((a, b) => a.name.localeCompare(b.name));

    const catalogNames = new Set(catalog.map(c => c.name));
    const other = owned.filter(i => !catalogNames.has(BladesHelpers.trimClassFromName(i.name)));

    return { catalog, other };
  }

  /* -------------------------------------------- */
  /*  Drag & drop                                  */
  /* -------------------------------------------- */

  async _handleDrop(droppedEntityFull) {
    if (!droppedEntityFull) return;
    switch (droppedEntityFull.type) {
      case "npc":
        await BladesHelpers.addAcquaintance(this.actor, droppedEntityFull);
        break;
      case "crew":
        await BladesHelpers.addCrew(this.actor, droppedEntityFull);
        break;
      case "item":
      case "ability":
      case "class":
        // Intentional no-ops, same as the legacy handleDrop.
        break;
      default:
        break;
    }
  }

  /** @override */
  async _onDropItem(event, data) {
    const allowed = await super._onDropItem?.(event, data);
    if (allowed === false) return false;
    if (!this.actor.isOwner) {
      ui.notifications.error(
        "You do not have sufficient permissions to edit this character. Please speak to your GM if you feel you have reached this message in error.",
        { permanent: true }
      );
      return false;
    }
    const droppedItem = await fromUuid(data.uuid);
    await this._handleDrop(droppedItem);
  }

  /** @override */
  async _onDropActor(event, data) {
    const allowed = await super._onDropActor?.(event, data);
    if (allowed === false) return false;
    if (!this.actor.isOwner) {
      ui.notifications.error(
        "You do not have sufficient permissions to edit this character. Please speak to your GM if you feel you have reached this message in error.",
        { permanent: true }
      );
      return false;
    }
    const droppedActor = await fromUuid(data.uuid);
    await this._handleDrop(droppedActor);
  }

  /* -------------------------------------------- */
  /*  Form submission                              */
  /* -------------------------------------------- */

  /**
   * Drop ephemeral Key XP radio names (and any stray system.keys.* paths) so a
   * normal submitOnChange form submit can never stomp Key slots -- ports the
   * legacy BladesActorSheet#_getSubmitData override to ApplicationV2's
   * equivalent hook. Every Key field edit instead goes through
   * _updateKeySlotField(), which reads the full current list via
   * actor.getComputedKeys() and writes it back whole.
   * @override
   */
  _prepareSubmitData(event, form, formData, updateData) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const flat = foundry.utils.flattenObject(submitData);
    for (const key of Object.keys(flat)) {
      if (key.startsWith("key-xp-") || key.startsWith("system.keys")) {
        delete flat[key];
      }
    }
    const cleaned = foundry.utils.expandObject(flat);
    if (cleaned.system?.keys !== undefined) {
      delete cleaned.system.keys;
    }
    return cleaned;
  }

  /**
   * Patch one field on one Key slot and write the full normalized list.
   * @param {Event} ev
   * @param {"key"|"experience"|"deadlocked_to"} field
   * @param {string|number} value
   */
  async _updateKeySlotField(ev, field, value) {
    const slotIndex = Number(ev.currentTarget.closest(".key-slot")?.dataset?.slotIndex);
    if (!Number.isInteger(slotIndex) || slotIndex < 0) return;

    const keysList = this.actor.getComputedKeys();
    if (!keysList[slotIndex]) return;
    keysList[slotIndex][field] = value;
    await this.actor.update({ "system.keys.list": keysList });
  }

  /* -------------------------------------------- */
  /*  Attribute / skill rolls                      */
  /* -------------------------------------------- */

  static async _onRollAttribute(event, target) {
    event.preventDefault();
    const attributeName = target.dataset.rollAttribute;
    let defaultDice = 0;
    try {
      const rollData = this.actor.getRollData?.();
      defaultDice = Number(rollData?.dice_amount?.[attributeName] ?? 0);
    } catch (err) {
      console.warn("Failed to determine dice amount for roll.", err);
      defaultDice = 0;
    }
    const sanitizedDice = Number.isNaN(defaultDice) ? 0 : defaultDice;
    await this.actor.rollAttributePopup(attributeName, sanitizedDice);
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
    const itemId = BladesSheetV2._itemIdFrom(target);
    if (!itemId) return;
    const linked = game.actors.get(itemId);
    if (linked) {
      linked.sheet.render(true);
    } else {
      await BladesHelpers.importAcquaintance(this.actor, itemId);
    }
  }

  static async _onAcquaintanceDelete(event, target) {
    const itemId = BladesSheetV2._itemIdFrom(target);
    if (!itemId) return;
    await BladesHelpers.removeAcquaintance(this.actor, itemId);
  }

  static async _onImportContacts(event, target) {
    const playbook = this.actor.items.find(i => i.type === "class")?.name;
    await BladesHelpers.import_pb_contacts(this.actor, playbook);
  }

  static async _onAddCustomContact(event, target) {
    await BladesHelpers.addCustomContact(this.actor);
  }

  /* -------------------------------------------- */
  /*  Crew link                                    */
  /* -------------------------------------------- */

  static async _onCrewDelete(event, target) {
    const itemId = BladesSheetV2._itemIdFrom(target);
    if (!itemId) return;
    await BladesHelpers.removeCrew(this.actor, itemId);
  }

  /* -------------------------------------------- */
  /*  Keys / Deadlocks                             */
  /* -------------------------------------------- */

  static async _onAddKeyPopup(event, target) {
    await BladesHelpers.addKeyPopup(this.actor);
  }

  // Deadlock toggle: check opens a choice popup; uncheck clears deadlocked_to.
  // preventDefault() so the checkbox's own visual state never drifts from
  // the actor's real deadlocked flag -- the re-render after either helper
  // call is what actually updates it.
  static async _onKeyBoomToggle(event, target) {
    event.preventDefault();
    const slotIndex = Number(target.closest(".key-slot")?.dataset?.slotIndex);
    if (!Number.isInteger(slotIndex) || slotIndex < 0) return;

    const slot = this.actor.getComputedKeys()[slotIndex];
    if (slot?.deadlocked) {
      await BladesHelpers.clearKeyDeadlock(this.actor, slotIndex);
    } else {
      await BladesHelpers.deadlockKeyPopup(this.actor, slotIndex);
    }
  }

  /* -------------------------------------------- */
  /*  Special Abilities / Loadout catalogs         */
  /* -------------------------------------------- */

  // Each row's checked box count is reconciled against how many matching
  // items the actor actually owns (creating/deleting the difference), which
  // is what lets multi-slot Loadout entries (e.g. 2 Bandoliers) work with
  // plain checkboxes instead of a single owned/not-owned toggle.
  static async _onCatalogToggle(event, target) {
    const row = target.closest(".catalog-item");
    if (!row) return;
    const itemType = row.dataset.itemType;
    const itemName = row.dataset.itemName;
    const sourceId = row.dataset.sourceId;
    const checkedCount = row.querySelectorAll(".catalog-toggle:checked").length;

    const owned = this.actor.items.filter(i => i.type === itemType && BladesHelpers.trimClassFromName(i.name) === itemName);
    const diff = checkedCount - owned.length;

    if (diff > 0) {
      const source = await BladesHelpers.getItemByType(itemType, sourceId);
      if (!source) return;
      const data = source.toObject();
      delete data._id;
      if (data.type === "item") data.system.equipped = true;
      const toCreate = Array.from({ length: diff }, () => foundry.utils.deepClone(data));
      await this.actor.createEmbeddedDocuments("Item", toCreate);
    } else if (diff < 0) {
      const toDelete = owned.slice(0, -diff).map(i => i.id);
      await this.actor.deleteEmbeddedDocuments("Item", toDelete);
    }
  }

  // Owned items outside the class catalog (Veteran picks, homebrew additions): a plain
  // checkbox marking whether the item is carried/in-use, persisted on system.equipped.
  static async _onItemEquippedToggle(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    await item.update({ "system.equipped": target.checked });
  }

  // Item use tracking (e.g. shots left in a gun): independent checkboxes reconciled by
  // count, same pattern as ability-uses-toggle. Spending a use never affects Load -- only
  // the equip checkbox above does that.
  static async _onItemUseToggle(event, target) {
    const row = target.closest(".item-uses");
    if (!row) return;
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const checkedCount = row.querySelectorAll(".item-use-toggle:checked").length;
    await item.update({ "system.uses_used": checkedCount });
  }

  // Bonus checkbox for a second carried copy (num_available > 1): an independent toggle
  // that counts the item's Load a second time when checked.
  static async _onItemBonusToggle(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    await item.update({ "system.bonus_equipped": target.checked });
  }

  // Ability use tracking: independent checkboxes per system.uses slot, reconciled by
  // count (like the Loadout slot checkboxes) rather than by which box was clicked.
  static async _onAbilityUsesToggle(event, target) {
    const row = target.closest(".ability-uses");
    if (!row) return;
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const checkedCount = row.querySelectorAll(".ability-uses-toggle:checked").length;
    await item.update({ "system.uses_used": checkedCount });
  }

  // Remove an owned item that falls outside the class catalog.
  static async _onOtherItemDelete(event, target) {
    const row = target.closest(".other-item");
    if (!row) return;
    await this.actor.deleteEmbeddedDocuments("Item", [row.dataset.itemId]);
  }

  /* -------------------------------------------- */
  /*  XP clock (world setting ClockXP)              */
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
