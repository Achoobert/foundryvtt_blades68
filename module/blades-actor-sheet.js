import { BladesSheetV2 } from "./blades-sheet-v2.js";
import { BladesActiveEffect } from "./blades-active-effect.js";
import { BladesHelpers } from "./blades-helpers.js";
import { enrichHTML } from "./compat.js";
import { getXpTriggerHtml } from "./xp-triggers.js";


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


export class BladesActorSheet extends BladesSheetV2 {

  static DEFAULT_OPTIONS = {
    
    
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
    body: { template: "systems/blades68/templates/actor-sheet.html", scrollable: [""] }
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

  
  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const owner = this.actor.isOwner;

    const selectedClass = this.actor.items.find(i => i.type === "class") ?? null;
    const playbookUnique = selectedClass ? (PLAYBOOK_UNIQUE[selectedClass.name] ?? null) : null;


    const xpTriggers = await getXpTriggerHtml("character", selectedClass?.system?.experience_clues ?? "");

    
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

    
    const loadBonusSources = this.actor.getLoadBonusSources?.() ?? [];
    const loadBonusTotal = loadBonusSources.reduce((sum, src) => sum + src.value, 0);
    const loadBonusTooltip = loadBonusSources
      .map(src => {
        const desc = BladesHelpers.stripHtml(src.description || "").trim();
        return desc ? `+${src.value} ${src.name}: ${desc}` : `+${src.value} ${src.name}`;
      })
      .join("\n");

    
    const coinLoad = Math.max(0, parseInt(this.actor.system.coin_load) || 0);
    const gearLoad = Math.max(0, (parseInt(this.actor.system.loadout) || 0) - coinLoad);
    const loadTooltip = coinLoad > 0
      ? `${game.i18n.localize(this.actor.system.load_level)} \u2014 ${game.i18n.format("BITD.LoadBreakdown", { gear: gearLoad, coin: coinLoad })}`
      : game.i18n.localize(this.actor.system.load_level);

    const description = await enrichHTML(this.actor.system.description, {
      secrets: owner,
      async: true
    });

    let blades68Mode = false;
    let showKeys = false;
    try { blades68Mode = game.settings.get("blades68", "Blades68Mode") === "blades68"; } catch (err) {  }
    try { showKeys = Boolean(game.settings.get("blades68", "ShowKeys")); } catch (err) {  }

    
    const system = {
      ...this.actor.system,
      load_levels,
      description
    };

    return {
      ...ctx,
      loadBonusTotal,
      loadBonusTooltip,
      loadTooltip,
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
      
      
      tabs: this._prepareTabs("primary"),
      effects: BladesActiveEffect.prepareActiveEffectCategories(this.actor.effects),
      blades68: blades68Mode,
      showKeys,
      blades68Keys: game.system.blades68Keys,
      selectedClass: selectedClass ? selectedClass.toObject() : null,
      xpTriggers,
      playbookUnique,
      otherAbilities,
      abilityShortList,
      itemCatalog,
      otherItems
    };
  }

  
  async _onRender(context, options) {
    await super._onRender(context, options);

    this._warnIfOverLoad();

    
    this.element.querySelectorAll(".key-select").forEach((el) => {
      el.addEventListener("change", (ev) => this._updateKeySlotField(ev, "key", ev.currentTarget.value));
    });
    this.element.querySelectorAll(".deadlocked-to-select").forEach((el) => {
      el.addEventListener("change", (ev) => this._updateKeySlotField(ev, "deadlocked_to", ev.currentTarget.value));
    });
    
    
    this.element.querySelectorAll('.key-marks input[type="radio"]').forEach((el) => {
      el.addEventListener("change", (ev) => {
        if (!ev.currentTarget.checked) return;
        this._updateKeySlotField(ev, "experience", Number(ev.currentTarget.value));
      });
    });
  }

  
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
        
        break;
      default:
        break;
    }
  }

  
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

  
  async _updateKeySlotField(ev, field, value) {
    const slotIndex = Number(ev.currentTarget.closest(".key-slot")?.dataset?.slotIndex);
    if (!Number.isInteger(slotIndex) || slotIndex < 0) return;

    const keysList = this.actor.getComputedKeys();
    if (!keysList[slotIndex]) return;
    const previous = Number(keysList[slotIndex][field]);
    keysList[slotIndex][field] = value;
    await this.actor.update({ "system.keys.list": keysList });

    if (field === "experience" && Number(value) > previous) {
      BladesHelpers.notifyXpReminder();
    }
  }

  
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

  
  static async _onCrewDelete(event, target) {
    const itemId = BladesSheetV2._itemIdFrom(target);
    if (!itemId) return;
    await BladesHelpers.removeCrew(this.actor, itemId);
  }

  
  static async _onAddKeyPopup(event, target) {
    await BladesHelpers.addKeyPopup(this.actor);
  }

  
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

  
  /**
   * Warn once when the character crosses into over-load. Going over is always
   * allowed -- the red numbers on the bar are the standing signal, so the toast
   * only fires on the way in. Watching the derived flag across renders catches
   * every route into it (gear, coin, dropping to a lighter tier) without a
   * check at each call site. The first render only seeds the flag.
   */
  _warnIfOverLoad() {
    const { loadout, load_max, load_level, over_load } = this.actor.system;
    const isOver = Boolean(over_load);
    if (isOver && this._overLoadSeen === false) {
      ui.notifications?.warn?.(game.i18n.format("BITD.OverLoadWarning", {
        load: loadout,
        max: load_max,
        level: game.i18n.localize(load_level)
      }));
    }
    this._overLoadSeen = isOver;
  }

  
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

  
  static async _onItemEquippedToggle(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    await item.update({ "system.equipped": target.checked });
  }

  
  static async _onItemUseToggle(event, target) {
    const row = target.closest(".item-uses");
    if (!row) return;
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const checkedCount = row.querySelectorAll(".item-use-toggle:checked").length;
    await item.update({ "system.uses_used": checkedCount });
  }

  
  static async _onItemBonusToggle(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    await item.update({ "system.bonus_equipped": target.checked });
  }

  
  static async _onAbilityUsesToggle(event, target) {
    const row = target.closest(".ability-uses");
    if (!row) return;
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const checkedCount = row.querySelectorAll(".ability-uses-toggle:checked").length;
    await item.update({ "system.uses_used": checkedCount });
  }

  
  static async _onOtherItemDelete(event, target) {
    const row = target.closest(".other-item");
    if (!row) return;
    await this.actor.deleteEmbeddedDocuments("Item", [row.dataset.itemId]);
  }

  
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
