import { prepareActiveEffectCategories } from "./effects.js";
import { BladesHelpers } from "./blades-helpers.js";
import {
  enrichHTML,
  renderHandlebarsTemplate,
  applyBladesThemeClasses,
} from "./compat.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Shared V2 base for the Blades68 Item sheet.
 *
 * One Item document class covers 15 wildly different sub-types (ability,
 * class, cohort, crew_ability, crew_type, crew_upgrade, faction,
 * heritage/background/vice/crew_reputation ("simple"), hunting_grounds, item,
 * prison, trouble) and, per module/blades.js, they are all still registered
 * under a single sheet class with no `types` filter -- so template selection
 * has to happen dynamically per-instance rather than via a static PARTS
 * lookup. `_renderHTML` below picks the right file from `this.item.type`
 * every render; `static PARTS.body` only exists to satisfy the mixin's
 * part-id bookkeeping (window content container, focus retention, etc).
 *
 * Scope policy mirrors BladesSheetV2: only type-shape-agnostic plumbing lives
 * here (active-effect dispatch, the radio-cycle widget, template dispatch,
 * description/experience_clues enrichment). Per-type derived data (cohort
 * scale/quality, faction clock normalization) lives on each type's
 * TypeDataModel under module/data/items/.
 */
export class ItemSheetV2 extends HandlebarsApplicationMixin(
  foundry.applications.sheets.ItemSheetV2,
) {
  static DEFAULT_OPTIONS = {
    classes: ["blades68", "sheet", "item"],
    window: { resizable: true },
    position: { width: 560, height: "auto" },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      "bid.itemEffectControl": ItemSheetV2._onEffectControl,
      "bid.radioToggle": {
        handler: ItemSheetV2._onRadioToggle,
        buttons: [0, 2],
      },
    },
  };

  static PARTS = {
    body: { template: "systems/blades68/templates/items/item.html" },
  };

  // item.type -> templates/items/<name>.html. Types absent from this map use
  // their own type name as the template name.
  static TEMPLATE_BY_TYPE = {
    heritage: "simple",
    background: "simple",
    vice: "simple",
    crew_reputation: "simple",
  };

  _templatePath() {
    const name = ItemSheetV2.TEMPLATE_BY_TYPE[this.item.type] ?? this.item.type;
    return `systems/blades68/templates/items/${name}.html`;
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    applyBladesThemeClasses(this.element);
  }

  /**
   * @override -- resolve the render template dynamically instead of a fixed PARTS map.
   * The base HandlebarsApplicationMixin._replaceHTML expects each part to be an already-parsed
   * HTMLElement (it calls `element.replaceWith(htmlElement)`, and DOM's replaceWith() silently
   * turns a bare string argument into an escaped Text node) -- so the rendered markup has to be
   * parsed here exactly like the mixin's own (private) #parsePartHTML does.
   */
  async _renderHTML(context, options) {
    const htmlString = await renderHandlebarsTemplate(
      this._templatePath(),
      context,
    );
    const tempEl = document.createElement("div");
    tempEl.innerHTML = htmlString;
    const element = tempEl.firstElementChild;
    element.dataset.applicationPart = "body";
    element.classList.add("scrollable");
    return { body: element };
  }

  /* -------------------------------------------- */
  /*  Context                                      */
  /* -------------------------------------------- */

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const item = this.item;
    const system = item.system;
    const owner = item.isOwner;

    const context = {
      ...ctx,
      item,
      document: item,
      _id: item.id,
      id: item.id,
      name: item.name,
      img: item.img,
      system: { ...system },
      owner,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      isGM: game.user.isGM,
      effects: prepareActiveEffectCategories(item.effects),
    };

    // The shared {{editor}} Handlebars helper expects already-enriched HTML
    // (see the legacy BladesItemSheet#getData this replaces) -- ProseMirror
    // re-sources the raw value once the user opens the editor, but the
    // read-only display needs enrichment baked in here. cohort.html and
    // faction.html render `system.description` through a plain <textarea>
    // instead, so they're excluded to avoid double-processing raw HTML into
    // a textarea.
    const enrichOpts = { secrets: owner, async: true };
    if (item.type !== "cohort" && item.type !== "faction") {
      // The raw value feeds the <prose-mirror> element's `value` attribute
      // (what ProseMirror actually edits); the enriched copy is what's
      // shown -- as the element's innerHTML -- before the editor opens.
      context.system.description_raw = system.description ?? "";
      context.system.description = await enrichHTML(
        system.description ?? "",
        enrichOpts,
      );
    }
    if (item.type === "class" || item.type === "crew_type") {
      context.system.experience_clues_raw = system.experience_clues ?? "";
      context.system.experience_clues = await enrichHTML(
        system.experience_clues ?? "",
        enrichOpts,
      );
    }

    if (item.type === "faction") {
      this._prepareFactionContext(context, system);
    }
    if (item.type === "crew_type") {
      context.turfs_data = system.turfs;
      context.turf_headers = system.turf_headers;
      context.can_edit = true;
      context.not_prison = true;
    }
    if (item.type === "prison") {
      context.turfs_data = system.turfs;
      context.can_edit = true;
    }

    return context;
  }

  /**
   * Faction goal-clock dropdown options + dot-tracker data. Kept off the
   * DataModel (unlike the legacy blades-item.js#prepareData(), which stashed
   * this raw HTML string onto `system.size_list_1/2` with no schema backing)
   * since it's pure render output, not persisted state.
   */
  _prepareFactionContext(context, system) {
    const sizes = game.system.bladesClocks?.sizes ?? [4, 6, 8, 10, 12];

    const sizeOptions = (max) =>
      sizes
        .map(
          (size) =>
            `<option value="${size}"${size === max ? " selected" : ""}>${size}</option>`,
        )
        .join("");

    context.size_list_1 = sizeOptions(system.goal_1_clock_max);
    context.size_list_2 = sizeOptions(system.goal_2_clock_max);
    context.goalClock1 = this._buildClockDots(
      system.goal_1_clock_max,
      system.goal_1_clock_value,
      `${this.item.id}-goal1`,
    );
    context.goalClock2 = this._buildClockDots(
      system.goal_2_clock_max,
      system.goal_2_clock_value,
      `${this.item.id}-goal2`,
    );
    context.goalClock1Img = BladesHelpers.clockImageUrl(
      system.goal_1_clock_max,
      system.goal_1_clock_value,
      "black",
    );
    context.goalClock2Img = BladesHelpers.clockImageUrl(
      system.goal_2_clock_max,
      system.goal_2_clock_value,
      "black",
    );
  }

  /**
   * Build the dot list for one clock, replicating the markup the shared
   * (unmodified) `blades-clock` Handlebars helper emits -- reimplemented
   * locally so each dot's label can carry `data-action="bid.radioToggle"`
   * (the helper itself only emits the plain `radio-toggle` CSS class, which
   * V2's action-dispatch model can't pick up without that attribute).
   */
  _buildClockDots(max, value, idPrefix) {
    max = parseInt(max) || 0;
    value = parseInt(value) || 0;
    if (value > max) value = max;

    const dots = [];
    for (let i = 1; i <= max; i++) {
      dots.push({ v: i, id: `${idPrefix}-${i}`, checked: value === i });
    }
    return { zeroId: `${idPrefix}-0`, zeroChecked: value === 0, dots };
  }

  /* -------------------------------------------- */
  /*  Active effects                               */
  /* -------------------------------------------- */

  /**
   * Reads from `data-effect-action` (not `data-action`, which V2 already
   * uses for dispatch) -- see BladesSheetV2's own note on the same pattern.
   * Items can't edit Active Effects while owned by an Actor (matches the
   * legacy `.effect-control` click guard).
   */
  static _onEffectControl(event, target) {
    if (this.item.isOwned) {
      ui.notifications.warn(game.i18n.localize("BITD.EffectWarning"));
      return;
    }

    const action = target.dataset.effectAction;
    const row = target.closest("tr");
    const effect = row?.dataset.effectId
      ? this.item.effects.get(row.dataset.effectId)
      : null;

    switch (action) {
      case "create":
        return this.item.createEmbeddedDocuments("ActiveEffect", [
          {
            name: "New Effect",
            img: "systems/blades68/styles/assets/icons/Icon.3_13.webp",
            origin: this.item.uuid,
            "duration.rounds":
              row?.dataset.effectType === "temporary" ? 1 : undefined,
            disabled: row?.dataset.effectType === "inactive",
          },
        ]);
      case "edit":
        return effect?.sheet.render(true);
      case "delete":
        return effect?.delete();
      case "toggle":
        return effect?.update({ disabled: !effect.disabled });
    }
  }

  /* -------------------------------------------- */
  /*  Radio-toggle widget (faction goal clocks)    */
  /* -------------------------------------------- */

  /**
   * Cycle radio inputs on click, decrement on right-click. Ported from
   * BladesSheetV2._onRadioToggle verbatim (it's fully generic over
   * `this.element`/`this.document`) since ItemSheetV2 doesn't share a base
   * class with it.
   */
  static async _onRadioToggle(event, target) {
    const input =
      target.tagName === "LABEL"
        ? this.element.querySelector(`#${CSS.escape(target.htmlFor)}`)
        : target;
    if (!input) return;

    const ctx = {
      sheet: this,
      document: this.document,
      input,
      event,
      name: input.name,
      value: Number.parseInt(input.value, 10),
      isContextMenu: event.type === "contextmenu",
    };
    if (Hooks.call("bladesRadioToggle", ctx) === false) return;

    event.preventDefault();

    const wasChecked = input.checked || event.type === "contextmenu";
    const targetValue = wasChecked ? ctx.value - 1 : ctx.value;
    const targetInput = wasChecked
      ? this.element.querySelector(
          `input[name="${ctx.name}"][value="${targetValue}"]`,
        )
      : input;
    if (!targetInput) return;

    targetInput.checked = true;
    targetInput.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
