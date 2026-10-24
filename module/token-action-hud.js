/**
 * Token Action HUD integration, bundled into the system.
 *
 * Nothing here runs unless token-action-hud-core is installed and active.
 */

import { BladesHelpers } from "./blades-helpers.js";
import { ATTRIBUTES } from "./data/attributes.js";

const CORE_MODULE_ID = "token-action-hud-core";


const REQUIRED_CORE_MODULE_VERSION = "2";


const VICE_KEY = "BITD.Vice";

const GROUP = {
  insight: { id: "insight", name: "BITD.SkillsInsight", type: "system" },
  prowess: { id: "prowess", name: "BITD.SkillsProwess", type: "system" },
  resolve: { id: "resolve", name: "BITD.SkillsResolve", type: "system" },
  resistance: { id: "resistance", name: "BITD.Resistance", type: "system" },
};

const LAYOUT_ACTIONS = "actions";
const LAYOUT_ATTRIBUTES = "attributes";


export function registerTokenActionHud() {
  
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


export function buildHudActionGroups(actor) {
  if (actor?.type !== "character") return [];

  const dice = actor.getRollData?.()?.dice_amount ?? {};
  const groups = [];

  for (const [attributeName, attribute] of Object.entries(ATTRIBUTES)) {
    const skillNames = Object.keys(attribute.skills);
    groups.push({
      groupData: { id: attributeName, type: "system" },
      actions: skillNames.map((skillName) =>
        buildAction(actor, dice, skillName),
      ),
    });
  }

  const resistance = Object.keys(ATTRIBUTES).map((attributeName) =>
    buildAction(actor, dice, attributeName),
  );
  resistance.push(buildAction(actor, dice, VICE_KEY, "BITD.Vice"));
  groups.push({
    groupData: { id: GROUP.resistance.id, type: "system" },
    actions: resistance,
  });

  return groups;
}


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


function makeActionHandler(coreModule) {
  return class BladesActionHandler extends coreModule.api.ActionHandler {
    
    async buildSystemActions(_groupIds) {
      for (const { groupData, actions } of buildHudActionGroups(this.actor)) {
        this.addActions(actions, groupData);
      }
    }
  };
}


function makeSystemManager(coreModule, BladesActionHandler, DEFAULTS) {
  return class BladesSystemManager extends coreModule.api.SystemManager {
    getActionHandler() {
      return new BladesActionHandler();
    }

    getAvailableRollHandlers() {
      return { core: "Blades '68" };
    }

    
    getRollHandler(_rollHandlerId) {
      return new coreModule.api.RollHandler();
    }

    async registerDefaults() {
      return DEFAULTS;
    }

    registerSettings(_coreUpdate) {}
  };
}


export function isTokenActionHudActive() {
  return game.modules.get(CORE_MODULE_ID)?.active === true;
}
