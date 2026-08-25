/**
 * Find-or-create a sidebar Folder of `type` ("Actor", "Item", "Cards", …)
 * with `name` under the folder id `parent` (null = sidebar root).
 */
export async function getOrCreateFolder(name, type, parent = null) {
  const existing = game.folders.find(
    (folder) => folder.name === name && folder.type === type && (folder.folder?.id ?? null) === parent
  );
  if (existing) return existing;
  return Folder.create({ name, type, folder: parent });
}

/**
 * Walks/creates a nested folder path (e.g. ['Blades68 Import', 'Factions'])
 * and returns the id of the deepest folder, for use as a document's `folder`.
 */
export async function getOrCreateFolderPath(path, type) {
  let parent = null;
  for (const name of path) {
    const folder = await getOrCreateFolder(name, type, parent);
    parent = folder.id;
  }
  return parent;
}
