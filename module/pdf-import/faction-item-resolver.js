const FACTION_SYSTEM_FIELDS = [
  'category',
  'tier',
  'hold',
  'description',
  'turf',
  'npcs',
  'notableAssets',
  'quirks',
  'allies',
  'enemies',
  'situation',
  'prestigeAbility'
];

export function normalizeFactionName(name) {
  return String(name ?? '')
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '')
    .toLocaleLowerCase('en-US');
}

function factionUpdateData(faction) {
  const data = { name: faction.name };
  if (faction.imagePath) data.img = faction.imagePath;
  for (const field of FACTION_SYSTEM_FIELDS) {
    if (faction[field] !== undefined) data[`system.${field}`] = faction[field];
  }
  return data;
}

async function getCompendiumFactions(packs) {
  const factions = [];
  for (const pack of packs) {
    if (pack.documentName !== 'Item') continue;
    try {
      const documents = await pack.getDocuments();
      factions.push(...documents.filter((item) => item.type === 'faction'));
    } catch (error) {
      console.warn(`[blades68] Could not read factions from ${pack.collection}`, error);
    }
  }
  return factions;
}

function findUnusedByName(items, name, used) {
  const normalized = normalizeFactionName(name);
  return items.find((item) => !used.has(item) && normalizeFactionName(item.name) === normalized);
}

function findUnusedAtOrAfter(items, index, used) {
  if (items[index] && !used.has(items[index])) return items[index];
  return items.find((item) => !used.has(item));
}

function cloneSource(item, folder) {
  const source = item.toObject();
  delete source._id;
  delete source._key;
  source.folder = folder;
  return source;
}

export async function resolveFactionItems(
  factions,
  {
    folder = null,
    worldItems = globalThis.game?.items?.filter((item) => item.type === 'faction') ?? [],
    compendiumItems,
    packs = globalThis.game?.packs ?? [],
    createItem = (data) => globalThis.Item.create(data)
  } = {}
) {
  const packItems = compendiumItems ?? (await getCompendiumFactions(packs));
  const usedWorld = new Set();
  const usedPack = new Set();
  const resolved = [];

  for (const [index, faction] of factions.entries()) {
    let item = findUnusedByName(worldItems, faction.name, usedWorld);

    if (!item) {
      const packItem = findUnusedByName(packItems, faction.name, usedPack);
      if (packItem) {
        usedPack.add(packItem);
        item = await createItem(cloneSource(packItem, folder));
      }
    }

    if (!item && faction.imagePath) {
      item = findUnusedAtOrAfter(worldItems, index, usedWorld);
    }

    if (!item && faction.imagePath) {
      const packItem = findUnusedAtOrAfter(packItems, index, usedPack);
      if (packItem) {
        usedPack.add(packItem);
        item = await createItem(cloneSource(packItem, folder));
      }
    }

    if (!item) {
      item = await createItem({
        name: faction.name,
        type: 'faction',
        folder,
        system: {}
      });
    }

    usedWorld.add(item);
    await item.update(factionUpdateData(faction));
    resolved.push(item);
  }

  return resolved;
}
