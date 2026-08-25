function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function gearKey(item) {
  return `${normalize(item.name)}::${normalize(item.system?.playbook)}`;
}

async function getGearSources() {
  const sources = game.items.filter((item) => item.type === 'gear');
  const seen = new Set(sources.map(gearKey));

  for (const pack of game.packs.filter((entry) => entry.documentName === 'Item')) {
    try {
      for (const item of await pack.getDocuments()) {
        if (item.type !== 'gear' || seen.has(gearKey(item))) continue;
        sources.push(item);
        seen.add(gearKey(item));
      }
    } catch (error) {
      console.warn(`[blades68] Could not read gear from ${pack.collection}`, error);
    }
  }

  return sources;
}

function embeddedGearData(source) {
  const data = source.toObject();
  delete data._id;
  delete data._key;
  delete data.folder;
  delete data.sort;
  delete data.ownership;
  delete data._stats;
  data.system = { ...data.system, carried: false };
  return data;
}

export async function applyPlaybookGear(playbook) {
  const actor = playbook.parent;
  if (!actor || actor.type !== 'character' || playbook.type !== 'playbook') return;

  const oldPlaybooks = actor.items.filter(
    (item) => item.type === 'playbook' && item.id !== playbook.id
  );
  const oldKeys = new Set(oldPlaybooks.map((item) => normalize(item.name)));
  const deleteIds = [
    ...oldPlaybooks.map((item) => item.id),
    ...actor.items
      .filter(
        (item) =>
          item.type === 'gear' &&
          normalize(item.system.playbook) &&
          oldKeys.has(normalize(item.system.playbook))
      )
      .map((item) => item.id)
  ];
  if (deleteIds.length) await actor.deleteEmbeddedDocuments('Item', deleteIds);

  const playbookKey = normalize(playbook.name);
  const existing = new Set(
    actor.items.filter((item) => item.type === 'gear').map(gearKey)
  );
  const createData = [];

  for (const source of await getGearSources()) {
    const sourcePlaybook = normalize(source.system.playbook);
    if (sourcePlaybook && sourcePlaybook !== playbookKey) continue;
    if (existing.has(gearKey(source))) continue;
    existing.add(gearKey(source));
    createData.push(embeddedGearData(source));
  }

  if (createData.length) await actor.createEmbeddedDocuments('Item', createData);
}

let queue = Promise.resolve();

/** Resolves once every queued gear application has finished. */
export function playbookGearSettled() {
  return queue;
}

/**
 * Playbook items reach an actor through several paths (sheet drops use
 * `Item.create({parent})`, imports use `createEmbeddedDocuments`), so the hook
 * is the only place that sees them all.
 */
export function registerPlaybookGearHooks() {
  Hooks.on('createItem', (item, options, userId) => {
    if (userId !== game.user.id) return;
    if (item.type !== 'playbook' || !(item.parent instanceof Actor)) return;
    queue = queue
      .then(() => applyPlaybookGear(item))
      .catch((error) => console.error('[blades68] Failed to apply playbook gear', error));
  });
}
