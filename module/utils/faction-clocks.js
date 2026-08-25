/**
 * Foundry Items cannot embed other Items, so a faction's project clocks live as
 * world-level clock Items tagged with the owning faction's uuid.
 */
export const FACTION_CLOCK_FLAG = 'factionUuid';

export function getFactionClocks(factionUuid) {
  if (!factionUuid) return [];
  return game.items.filter(
    (item) =>
      item.type === 'clock' && item.getFlag('blades68', FACTION_CLOCK_FLAG) === factionUuid
  );
}

export function buildFactionClockData(factionUuid, { name, max = 4, shared = true } = {}) {
  return {
    name,
    type: 'clock',
    system: { max, shared },
    flags: { blades68: { [FACTION_CLOCK_FLAG]: factionUuid } }
  };
}
