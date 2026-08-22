import { BLADES68 } from '../config.js';
import { postRollChatCard } from './chat-card.js';

const RESISTANCE_STRESS_COST = {
  [BLADES68.RESULT_TIERS.CRITICAL]: 0,
  [BLADES68.RESULT_TIERS.SUCCESS]: 0,
  [BLADES68.RESULT_TIERS.PARTIAL]: 1,
  [BLADES68.RESULT_TIERS.FAILURE]: 2
};

export function classifyResultTier(dice) {
  if (!dice.length) return BLADES68.RESULT_TIERS.FAILURE;
  const highest = Math.max(...dice);
  const sixes = dice.filter((die) => die === 6).length;

  if (sixes >= 2) return BLADES68.RESULT_TIERS.CRITICAL;
  if (highest === 6) return BLADES68.RESULT_TIERS.SUCCESS;
  if (highest >= 4) return BLADES68.RESULT_TIERS.PARTIAL;
  return BLADES68.RESULT_TIERS.FAILURE;
}

export async function rollDicePool(poolSize) {
  const size = Math.max(0, poolSize);
  const zeroDice = size === 0;
  const formula = zeroDice ? '2d6kl' : `${size}d6`;
  const roll = await new Roll(formula).evaluate();
  const die = roll.dice[0];
  const dice = die.results.filter((result) => result.active !== false).map((result) => result.result);

  return { roll, zeroDice, dice, tier: classifyResultTier(dice) };
}

function getActionRating(actor, attribute, actionKey) {
  return actor.system.attributes?.[attribute]?.actions?.[actionKey] ?? 0;
}

function getOutcomeText(position, tier) {
  if (!position) return null;
  return game.i18n.localize(`BLADES68.RollOutcome.${position}.${tier}`);
}

function getPositionEffectSubtitle(position, effect) {
  if (!position || !effect) return null;
  return game.i18n.format('BLADES68.Chat.PositionEffect', {
    position: game.i18n.localize(`BLADES68.Position.${position}`),
    effect: game.i18n.localize(`BLADES68.Effect.${effect}`)
  });
}

export async function rollAction({ actor, attribute, actionKey, position, effect, modifier = 0 }) {
  const rating = getActionRating(actor, attribute, actionKey);
  const poolSize = rating + modifier;
  const result = await rollDicePool(poolSize);

  await postRollChatCard({
    actor,
    title: game.i18n.format('BLADES68.Chat.ActionRollTitle', {
      action: game.i18n.localize(`BLADES68.Action.${actionKey}`)
    }),
    subtitle: getPositionEffectSubtitle(position, effect),
    poolSize,
    result,
    outcome: getOutcomeText(position, result.tier)
  });

  return result;
}

export async function rollResistance({ actor, attribute, actionKey, modifier = 0 }) {
  const rating = getActionRating(actor, attribute, actionKey);
  const poolSize = rating + modifier;
  const result = await rollDicePool(poolSize);
  const stressCost = RESISTANCE_STRESS_COST[result.tier];

  await postRollChatCard({
    actor,
    title: game.i18n.format('BLADES68.Chat.ResistanceRollTitle', {
      action: game.i18n.localize(`BLADES68.Action.${actionKey}`)
    }),
    poolSize,
    result,
    extra: game.i18n.format('BLADES68.Chat.StressCost', { stress: stressCost })
  });

  return { ...result, stressCost };
}

export async function rollFlatPool({ actor, position, effect, modifier = 0 }) {
  const rating = actor.system.actionRating ?? 0;
  const poolSize = rating + modifier;
  const result = await rollDicePool(poolSize);

  await postRollChatCard({
    actor,
    title: game.i18n.localize('BLADES68.Chat.ActionRollGenericTitle'),
    subtitle: getPositionEffectSubtitle(position, effect),
    poolSize,
    result,
    outcome: getOutcomeText(position, result.tier)
  });

  return result;
}

export async function rollFortune({ actor = null, poolSize }) {
  const result = await rollDicePool(poolSize);

  await postRollChatCard({
    actor,
    title: game.i18n.localize('BLADES68.Chat.FortuneRollTitle'),
    poolSize,
    result
  });

  return result;
}
