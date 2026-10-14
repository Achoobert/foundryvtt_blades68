/**
 * Token Action HUD integration, bundled into the system.
 *
 * Nothing here runs unless token-action-hud-core is installed and active.
 */

import { BladesHelpers } from "./blades-helpers.js";

const CORE_MODULE_ID = "token-action-hud-core";

/** Major version of Token Action HUD Core this integration targets. */
const REQUIRED_CORE_MODULE_VERSION = "2";

/** Dice pool key used by `getAttributeDiceToThrow()` for the vice roll. */
const VICE_KEY = "BITD.Vice";

const GROUP = {
  insight: { id: "insight", name: "BITD.SkillsInsight", type: "system" },
  prowess: { id: "prowess", name: "BITD.SkillsProwess", type: "system" },
  resolve: { id: "resolve", name: "BITD.SkillsResolve", type: "system" },
  resistance: { id: "resistance", name: "BITD.Resistance", type: "system" },
};

const LAYOUT_ACTIONS = "actions";
const LAYOUT_ATTRIBUTES = "attributes";

/**
 * Register the Token Action HUD handshake. Safe to call unconditionally: without the
 * core module the hook simply never fires.
 */
export function registerTokenActionHud() {
  // Exposed for the Quench batch, which exercises the builder without the core module.
  game.system.tokenActionHud = {
    buildHudActionGroups,
    requiredCoreModuleVersion: REQUIRED_CORE_MODULE_VERSION,
    registered: false,
  };

  Hooks.once("tokenActionHudCoreApiReady", (coreModule) => {
    const DEFAULTS = buildDefaults();
    const BladesActionHandler = makeActionHandler(coreModule);
    const BladesSystemManager = makeSystemManager(
      coreModule,
      BladesActionHandler,
      DEFAULTS,
    );

    Object.assign(game.system.tokenActionHud, {
      registered: true,
      defaults: DEFAULTS,
      ActionHandler: BladesActionHandler,
      SystemManager: BladesSystemManager,
    });

    Hooks.call("tokenActionHudSystemReady", {
      api: {
        requiredCoreModuleVersion: REQUIRED_CORE_MODULE_VERSION,
        SystemManager: BladesSystemManager,
      },
    });
  });
}

/* -------------------------------------------- */
/*  Defaults                                    */
/* -------------------------------------------- */

function buildDefaults() {
  const groups = foundry.utils.deepClone(GROUP);

  for (const group of Object.values(groups)) {
    group.name = game.i18n.localize(group.name);
    group.listName = `Group: ${group.name}`;
  }

  const nest = (layoutId, group) => ({
    ...group,
    nestId: `${layoutId}_${group.id}`,
  });

  return {
    layout: [
      {
        nestId: LAYOUT_ACTIONS,
        id: LAYOUT_ACTIONS,
        name: game.i18n.localize("BITD.TAHActions"),
        groups: [groups.insight, groups.prowess, groups.resolve].map((group) =>
          nest(LAYOUT_ACTIONS, group),
        ),
      },
      {
        nestId: LAYOUT_ATTRIBUTES,
        id: LAYOUT_ATTRIBUTES,
        name: game.i18n.localize("BITD.TAHAttributes"),
        groups: [nest(LAYOUT_ATTRIBUTES, groups.resistance)],
      },
    ],
    groups: Object.values(groups),
  };
}

/* -------------------------------------------- */
/*  Action building                             */
/* -------------------------------------------- */

/**
 * Build every HUD group for a character, as plain data.
 *
 * Kept free of Token Action HUD Core types so it can be unit tested on its own.
 *
 * @param {Actor} actor
 * @returns {Array<{groupData: {id: string, type: string}, actions: object[]}>}
 */
export function buildHudActionGroups(actor) {
  if (actor?.type !== "character") return [];

  const dice = actor.getRollData?.()?.dice_amount ?? {};
  const attributes = game.model.Actor.character.attributes;
  const groups = [];

  for (const attributeName in attributes) {
    const skillNames = Object.keys(attributes[attributeName].skills ?? {});
    groups.push({
      groupData: { id: attributeName, type: "system" },
      actions: skillNames.map((skillName) =>
        buildAction(actor, dice, skillName),
      ),
    });
  }

  const resistance = Object.keys(attributes).map((attributeName) =>
    buildAction(actor, dice, attributeName),
  );
  resistance.push(buildAction(actor, dice, VICE_KEY, "BITD.Vice"));
  groups.push({
    groupData: { id: GROUP.resistance.id, type: "system" },
    actions: resistance,
  });

  return groups;
}

/**
 * Build a single HUD action that opens the usual roll dialog.
 *
 * @param {Actor}  actor
 * @param {object} dice      Map of roll name to dice pool, from `getRollData()`.
 * @param {string} rollName  The key `rollAttributePopup` expects.
 * @param {string} [labelKey] Override for the localization key.
 * @returns {object}
 */
function buildAction(actor, dice, rollName, labelKey) {
  const diceAmount = Number(dice[rollName] ?? 0);
  const name = game.i18n.localize(
    labelKey ?? BladesHelpers.getRollLabel(rollName),
  );

  return {
    id: rollName,
    name,
    info1: { text: String(diceAmount) },
    tooltip: {
      content: `${name}: ${diceAmount}d`,
      class: "tah-system-tooltip",
      direction: "LEFT",
    },
    onClick: () => actor.rollAttributePopup(rollName, diceAmount),
  };
}

/* -------------------------------------------- */
/*  Action handler                              */
/* -------------------------------------------- */

function makeActionHandler(coreModule) {
  return class BladesActionHandler extends coreModule.api.ActionHandler {
    /**
     * Build the action-rating and resistance rolls for the selected character.
     *
     * @param {string[]} _groupIds
     */
    async buildSystemActions(_groupIds) {
      for (const { groupData, actions } of buildHudActionGroups(this.actor)) {
        this.addActions(actions, groupData);
      }
    }
  };
}

/* -------------------------------------------- */
/*  System manager                              */
/* -------------------------------------------- */

function makeSystemManager(coreModule, BladesActionHandler, DEFAULTS) {
  return class BladesSystemManager extends coreModule.api.SystemManager {
    getActionHandler() {
      return new BladesActionHandler();
    }

    getAvailableRollHandlers() {
      return { core: "Blades '68" };
    }

    /**
     * Actions carry their own `onClick`, so the stock handler does everything we need.
     *
     * This must be a real instance: core does `this.getRollHandler(id) ?? new RollHandler`
     * and `??` does not catch the `false` the base class returns, so returning `false`
     * makes core assign onto a primitive and throw before the HUD ever renders.
     */
    getRollHandler(_rollHandlerId) {
      return new coreModule.api.RollHandler();
    }

    async registerDefaults() {
      return DEFAULTS;
    }

    registerSettings(_coreUpdate) {}
  };
}

/**
 * Whether Token Action HUD Core is available. Only used for logging and tests.
 *
 * @returns {boolean}
 */
export function isTokenActionHudActive() {
  return game.modules.get(CORE_MODULE_ID)?.active === true;
}
