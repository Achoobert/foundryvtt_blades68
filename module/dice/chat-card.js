export async function postRollChatCard({ actor, title, subtitle, poolSize, result, extra, outcome }) {
  const content = await foundry.applications.handlebars.renderTemplate(
    'systems/blades68/templates/chat/action-roll.hbs',
    {
      title,
      subtitle,
      poolSize,
      zeroDice: result.zeroDice,
      dice: result.dice,
      tier: result.tier,
      tierLabel: game.i18n.localize(`BLADES68.ResultTier.${result.tier}`),
      extra,
      outcome
    }
  );

  return ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content,
    rolls: [result.roll],
    sound: CONFIG.sounds.dice
  });
}
