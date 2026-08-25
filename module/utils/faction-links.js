/**
 * Faction is an Item type, but NPCs reference the canonical faction rather than
 * embedding a copy, so tier/status edits stay in one place. These helpers build
 * the option list for that reference and resolve it back to a document.
 */

/** World factions plus every faction indexed in an Item compendium. */
export async function getFactionChoices() {
  const choices = game.items
    .filter((item) => item.type === 'faction')
    .map((item) => ({ uuid: item.uuid, name: item.name, group: game.i18n.localize('BLADES68.World') }));

  for (const pack of game.packs) {
    if (pack.documentName !== 'Item') continue;
    const index = pack.indexed ? pack.index : await pack.getIndex();
    for (const entry of index) {
      if (entry.type !== 'faction') continue;
      choices.push({
        uuid: pack.getUuid(entry._id),
        name: entry.name,
        group: pack.metadata.label
      });
    }
  }

  return choices.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
}

/** Groups {@link getFactionChoices} output for rendering as `<optgroup>`s. */
export async function getGroupedFactionChoices() {
  const grouped = new Map();
  for (const choice of await getFactionChoices()) {
    if (!grouped.has(choice.group)) grouped.set(choice.group, []);
    grouped.get(choice.group).push(choice);
  }
  return [...grouped].map(([group, options]) => ({ group, options }));
}

/**
 * Resolves a stored faction uuid without awaiting a compendium load, so sheets
 * can render synchronously. Returns null when the reference is empty or broken.
 */
export function resolveFaction(uuid) {
  if (!uuid) return null;
  const item = fromUuidSync(uuid);
  if (!item) return null;
  return {
    uuid,
    name: item.name,
    img: item.img,
    tier: item.system?.tier ?? 0,
    hold: item.system?.hold ?? 'weak',
    status: item.system?.status ?? 0
  };
}
