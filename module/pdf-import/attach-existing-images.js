/**
 * Mirrors what "Import Faction Images from PDF" and "Import City Map from
 * PDF" do to Faction items and Scenes, but starting from images that are
 * already sitting in the shared blades68/ data directory instead of a
 * freshly-uploaded PDF. uploadImageBlob() (card-image-extractor.js) saves
 * art under "blades68/<subdir>", a path relative to the Foundry Data root
 * rather than the current world - so once one world's GM has run a PDF
 * import, every other world sees the same files here and can pick them up
 * without asking the GM to import all over again.
 */

const SYSTEM_ID = "blades68";
const PACK_ID = `${SYSTEM_ID}.blades68_factions`;
const UPLOAD_DIR = "blades68";
const MAP_SUBDIR = "maps";
const SCENE_NAME = "Doskvol City Map";
const IMAGE_EXT_RE = /\.(webp|png|jpe?g|gif)$/i;
const MAP_FILE_RE = /^city_map(?:_p(\d+))?\.(?:webp|png|jpe?g|gif)$/i;

function getFilePickerClass() {
  return foundry.applications.apps?.FilePicker?.implementation ?? foundry.applications.apps.FilePicker;
}

async function listImageFiles(subdir) {
  const FilePickerClass = getFilePickerClass();
  try {
    const result = await FilePickerClass.browse("data", `${UPLOAD_DIR}/${subdir}`);
    return (result?.files ?? []).filter((path) => IMAGE_EXT_RE.test(path));
  } catch (err) {
    // The directory doesn't exist yet - no world has imported anything.
    return [];
  }
}

const normalize = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, "");
const filenameOf = (path) => path.split("/").pop();
const stripExt = (name) => name.replace(/\.[^.]+$/, "");

function loadImageSize(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(`Could not load image: ${src}`));
    img.src = src;
  });
}

/**
 * Assigns art to Faction items by matching a normalized filename against a
 * normalized item name - the same slug uploadImageBlob() was given when the
 * PDF importer first saved the file, so this doesn't need the PDF's page
 * order to find the match.
 */
export async function attachExistingFactionImages() {
  const files = (await Promise.all(["factions", "locations"].map(listImageFiles))).flat();
  if (!files.length) return 0;

  const pack = game.packs.get(PACK_ID);
  if (!pack) return 0;

  const factionDocs = (await pack.getDocuments()).filter((item) => item.type === "faction");
  if (!factionDocs.length) return 0;
  const docsByName = new Map(factionDocs.map((doc) => [normalize(doc.name), doc]));

  const wasLocked = pack.locked;
  if (wasLocked) await pack.configure({ locked: false });

  let updated = 0;
  try {
    for (const path of files) {
      const doc = docsByName.get(normalize(stripExt(filenameOf(path))));
      if (!doc || doc.img === path) continue;
      await doc.update({ img: path });
      updated++;
    }
  } finally {
    if (wasLocked) await pack.configure({ locked: true });
  }
  return updated;
}

/**
 * Creates the city map scene(s) from already-uploaded map pages, the same
 * way the map PDF importer does. Page dimensions come from loading the
 * image itself rather than the PDF viewport, since there's no PDF here.
 */
export async function createScenesFromExistingMaps() {
  const files = await listImageFiles(MAP_SUBDIR);
  const pages = files
    .map((path) => {
      const match = MAP_FILE_RE.exec(filenameOf(path));
      return match ? { path, pageNumber: match[1] ? Number(match[1]) : 1 } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.pageNumber - b.pageNumber);
  if (!pages.length) return 0;

  const SceneClass = foundry.documents?.Scene ?? Scene;
  const gridless = CONST?.GRID_TYPES?.GRIDLESS ?? 0;

  const sceneData = [];
  for (const page of pages) {
    const name = pages.length > 1 ? `${SCENE_NAME} (${page.pageNumber})` : SCENE_NAME;
    if (game.scenes.getName(name)) continue;
    let size;
    try {
      size = await loadImageSize(page.path);
    } catch (err) {
      console.warn(`${SYSTEM_ID} | Could not read map image ${page.path}:`, err);
      continue;
    }
    sceneData.push({
      name,
      background: { src: page.path },
      width: size.width,
      height: size.height,
      padding: 0,
      backgroundColor: "#000000",
      grid: { type: gridless, size: 100 },
      tokenVision: false,
      fog: { exploration: false },
    });
  }
  if (!sceneData.length) return 0;

  const created = await SceneClass.createDocuments(sceneData);
  return created.length;
}

/**
 * Entry point for the ready hook: picks up any faction art or city map
 * pages a different world already imported. GM-only, since it edits the
 * shared Factions compendium and creates Scenes.
 */
export async function attachExistingImportedImages() {
  if (!game.user.isGM) return;

  const [updated, created] = await Promise.all([
    attachExistingFactionImages(),
    createScenesFromExistingMaps(),
  ]);

  if (updated || created) {
    ui.notifications.info(
      `Blades '68: found previously imported art - updated ${updated} faction image${updated === 1 ? "" : "s"} ` +
      `and created ${created} scene${created === 1 ? "" : "s"}.`
    );
  }
}
