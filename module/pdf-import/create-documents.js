import { buildFactionClockData } from '../utils/faction-clocks.js';
import { getOrCreateFolder } from './folders.js';
import { resolveFactionItems } from './faction-item-resolver.js';

export async function createFactionItems(factions, { folder = null } = {}) {
  const created = await resolveFactionItems(factions, { folder });
  let clockFolder = null;

  for (const [index, faction] of factions.entries()) {
    const item = created[index];
    if (faction.projects?.length) {
      clockFolder ??= (await getOrCreateFolder('Project Clocks', 'Item', folder))?.id ?? null;
      await Item.createDocuments(
        faction.projects.map((project) => ({
          ...buildFactionClockData(item.uuid, { name: project.name, max: project.max ?? 4 }),
          folder: clockFolder
        }))
      );
    }
  }

  return created;
}

export async function createPlaybookItems(
  playbooks,
  { playbookType = 'playbook', abilityType = 'ability', folder = null } = {}
) {
  const created = [];
  const normalize = (value) => value.trim().toLowerCase();
  const gearPlaybooks = new Map();
  const commonThreshold = Math.max(2, Math.ceil(playbooks.length * 0.75));
  const isCommonGear = (key) => gearPlaybooks.get(key)?.size >= commonThreshold;

  if (playbookType === 'playbook') {
    for (const [index, playbook] of playbooks.entries()) {
      for (const gear of playbook.gear ?? []) {
        const key = normalize(gear.name);
        if (!gearPlaybooks.has(key)) gearPlaybooks.set(key, new Set());
        gearPlaybooks.get(key).add(index);
      }
    }

    const commonGear = new Map();
    for (const playbook of playbooks) {
      for (const gear of playbook.gear ?? []) {
        if (isCommonGear(normalize(gear.name))) {
          commonGear.set(normalize(gear.name), gear);
        }
      }
    }

    const commonGearFolder = commonGear.size
      ? (await getOrCreateFolder('Common Gear', 'Item', folder))?.id ?? folder
      : folder;

    for (const gear of commonGear.values()) {
      const gearItem = await Item.create({
        name: gear.name,
        type: 'gear',
        folder: commonGearFolder,
        system: { load: gear.load ?? 1, carried: false, playbook: '' }
      });
      created.push(gearItem);
    }
  }

  for (const playbook of playbooks) {
    // One subfolder per playbook keeps its abilities and gear together instead
    // of scattering hundreds of items across a single flat list.
    const playbookFolder = (await getOrCreateFolder(playbook.name, 'Item', folder))?.id ?? folder;

    const playbookItem = await Item.create({
      name: playbook.name,
      type: playbookType,
      folder: playbookFolder,
      system: { description: playbook.description ?? '' }
    });
    created.push(playbookItem);

    for (const ability of playbook.abilities ?? []) {
      const abilityItem = await Item.create({
        name: ability.name,
        type: abilityType,
        folder: playbookFolder,
        system: { description: ability.description ?? '', playbook: playbook.name.toLowerCase() }
      });
      created.push(abilityItem);
    }

    if (playbookType === 'playbook') {
      const playbookKey = normalize(playbook.name);
      const uniqueGear = new Map(
        (playbook.gear ?? []).map((gear) => [normalize(gear.name), gear])
      );
      for (const [key, gear] of uniqueGear) {
        if (isCommonGear(key)) continue;
        const gearItem = await Item.create({
          name: gear.name,
          type: 'gear',
          folder: playbookFolder,
          system: { load: gear.load ?? 1, carried: false, playbook: playbookKey }
        });
        created.push(gearItem);
      }
    }
  }

  return created;
}

/**
 * Builds a native Foundry Cards "deck" document from a set of uploaded card
 * images (one Card per image), the same shape core's own Cards presets
 * (e.g. its built-in Tarot deck) use: a Cards document with an embedded Card
 * per image, each Card with a single face pointing at that image.
 */
export async function createCardsDeck(name, images, { folder = null } = {}) {
  const cards = images.map((image, index) => ({
    name: `${name} ${index + 1}`,
    faces: [{ name: `${name} ${index + 1}`, img: image.path }],
    face: 0,
    back: { img: image.path }
  }));

  return Cards.create({
    name,
    type: 'deck',
    img: images[0]?.path,
    folder,
    cards
  });
}
