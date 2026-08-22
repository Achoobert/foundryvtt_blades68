export async function createFactionActors(factions) {
  const created = [];

  for (const faction of factions) {
    const actor = await Actor.create({
      name: faction.name,
      type: 'faction',
      img: faction.imagePath || undefined,
      system: {
        category: faction.category ?? 'underworld',
        tier: faction.tier ?? 0,
        hold: faction.hold ?? 'weak',
        description: faction.description ?? '',
        turf: faction.turf ?? '',
        npcs: faction.npcs ?? '',
        notableAssets: faction.notableAssets ?? '',
        quirks: faction.quirks ?? '',
        allies: faction.allies ?? '',
        enemies: faction.enemies ?? '',
        situation: faction.situation ?? '',
        prestigeAbility: faction.prestigeAbility ?? { name: '', description: '' }
      }
    });

    if (faction.projects?.length) {
      await actor.createEmbeddedDocuments(
        'Item',
        faction.projects.map((project) => ({
          name: project.name,
          type: 'clock',
          system: { max: project.max ?? 4, shared: true }
        }))
      );
    }

    created.push(actor);
  }

  return created;
}

export async function createPlaybookItems(playbooks, { playbookType = 'playbook', abilityType = 'ability' } = {}) {
  const created = [];

  for (const playbook of playbooks) {
    const playbookItem = await Item.create({
      name: playbook.name,
      type: playbookType,
      system: { description: playbook.description ?? '' }
    });
    created.push(playbookItem);

    for (const ability of playbook.abilities ?? []) {
      const abilityItem = await Item.create({
        name: ability.name,
        type: abilityType,
        system: { description: ability.description ?? '', playbook: playbook.name.toLowerCase() }
      });
      created.push(abilityItem);
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
export async function createCardsDeck(name, images) {
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
    cards
  });
}
