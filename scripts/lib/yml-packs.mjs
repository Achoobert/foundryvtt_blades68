/**
 * Shared helpers for lossless YAML <-> NeDB pack compile/extract.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export const PACK_MANIFEST = "_pack.yml";

/** Packs with this build_order compile after every other pack. */
export const BUILD_ORDER_LAST = "last";

/** Map Foundry packFolders name -> filesystem slug. */
export function folderSlug(name) {
  return String(name)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Safe document filename from name (+ optional id suffix on collision). */
export function docSlug(name, id = "") {
  const base = String(name || "unnamed")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "unnamed";
  return id ? `${base}--${id}` : base;
}

export function loadSystemManifest(root) {
  return JSON.parse(fs.readFileSync(path.join(root, "system.json"), "utf8"));
}

/**
 * Build pack placement map from system.json:
 * { packName: { game, folderSlug, folderLabel, pack } }
 */
export function packPlacement(system) {
  const folderByPack = new Map();
  function walkFolders(folders) {
    for (const folder of folders ?? []) {
      for (const packName of folder.packs ?? []) {
        folderByPack.set(packName, folder);
      }
      walkFolders(folder.folders);
    }
  }
  walkFolders(system.packFolders);

  const placement = new Map();
  for (const pack of system.packs ?? []) {
    const folder = folderByPack.get(pack.name);
    if (!folder) {
      throw new Error(`Pack "${pack.name}" missing from packFolders`);
    }
    const isBlades68 = /68/.test(folder.name);
    placement.set(pack.name, {
      game: isBlades68 ? "blades68" : "blades_in_the_dark",
      folderSlug: folderSlug(folder.name),
      folderLabel: folder.name,
      pack,
    });
  }
  return placement;
}

export function readNedb(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

export function writeNedb(filePath, docs) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const sorted = [...docs].sort((a, b) => {
    const ida = String(a._id ?? "");
    const idb = String(b._id ?? "");
    if (ida && idb && ida !== idb) return ida.localeCompare(idb);
    return String(a.name ?? "").localeCompare(String(b.name ?? ""));
  });
  fs.writeFileSync(filePath, sorted.map((d) => JSON.stringify(d)).join("\n") + (sorted.length ? "\n" : ""));
  return sorted;
}

/** Recursively find every _pack.yml under sourceRoot. */
export function findPackManifests(sourceRoot) {
  const found = [];
  if (!fs.existsSync(sourceRoot)) return found;

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === PACK_MANIFEST) found.push(full);
    }
  }
  walk(sourceRoot);
  return found.sort();
}

export function loadPackManifest(manifestPath) {
  const raw = yaml.load(fs.readFileSync(manifestPath, "utf8"));
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${manifestPath}: expected mapping`);
  }
  for (const key of ["name", "label", "type", "path"]) {
    if (!raw[key]) throw new Error(`${manifestPath}: missing required \`${key}\``);
  }
  if (raw.build_order != null && raw.build_order !== BUILD_ORDER_LAST) {
    throw new Error(
      `${manifestPath}: build_order must be "${BUILD_ORDER_LAST}" when set (got "${raw.build_order}")`
    );
  }
  return raw;
}

/**
 * Load all document YAML files in a pack directory (not _pack.yml).
 * Returns { docs, problems }.
 */
export function loadPackDocuments(packDir) {
  const docs = [];
  const problems = [];
  const seenIds = new Map();
  const entries = fs
    .readdirSync(packDir)
    .filter((name) => /\.ya?ml$/i.test(name) && name !== PACK_MANIFEST)
    .sort();

  for (const entry of entries) {
    const file = path.join(packDir, entry);
    let loaded;
    try {
      loaded = yaml.loadAll(fs.readFileSync(file, "utf8"));
    } catch (err) {
      problems.push(`${file}: invalid YAML - ${err.message}`);
      continue;
    }
    const sources = loaded.filter((source) => source != null);
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const loc = sources.length > 1 ? `${file}#${i + 1}` : file;
      if (typeof source !== "object" || Array.isArray(source)) {
        problems.push(`${loc}: expected a document mapping`);
        continue;
      }
      if (!source._id) {
        problems.push(`${loc}: missing required \`_id\``);
        continue;
      }
      if (!source.name) {
        problems.push(`${loc}: missing required \`name\``);
        continue;
      }
      const id = String(source._id);
      if (seenIds.has(id)) {
        problems.push(`${loc}: duplicate _id ${id} (also ${seenIds.get(id)})`);
        continue;
      }
      seenIds.set(id, loc);
      docs.push(source);
    }
  }
  return { docs, problems };
}

/** Foundry document class for a pack type, used to build compendium UUIDs. */
const PACK_DOCUMENT_CLASS = {
  Item: "Item",
  Actor: "Actor",
  Macro: "Macro",
  RollTable: "RollTable",
  JournalEntry: "JournalEntry",
};

/** Stable 16-char id for a document embedded on an owner document. */
export function embeddedItemId(ownerId, packName, sourceId, position) {
  return crypto
    .createHash("sha256")
    .update([ownerId, packName, sourceId, position].join("\0"))
    .digest("hex")
    .slice(0, 16);
}

/**
 * Index compiled packs for cross-pack lookup.
 * Input: iterable of { name, type, docs }.
 * Returns { byId, byName } keyed by pack + id / pack + lowercased name; each
 * entry is { pack, packType, doc }.
 */
export function buildPackIndex(packs) {
  const byId = new Map();
  const byName = new Map();
  for (const { name: pack, type: packType, docs } of packs) {
    for (const doc of docs ?? []) {
      const entry = { pack, packType, doc };
      byId.set(indexKey(pack, doc._id), entry);
      const key = indexKey(pack, String(doc.name ?? "").toLowerCase());
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(entry);
    }
  }
  return { byId, byName };
}

function indexKey(pack, suffix) {
  return `${pack}\u0000${suffix}`;
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/** Deep merge `patch` onto a clone of `base`; arrays and scalars are replaced. */
export function mergeDeep(base, patch) {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return structuredClone(patch === undefined ? base : patch);
  }
  const out = structuredClone(base);
  for (const [key, value] of Object.entries(patch)) {
    out[key] = isPlainObject(value) && isPlainObject(out[key]) ? mergeDeep(out[key], value) : structuredClone(value);
  }
  return out;
}

function lookupRef(ref, index) {
  const pack = ref.pack;
  if (!pack) return { error: "ref needs `pack`" };
  if (ref.id) {
    const entry = index.byId.get(indexKey(pack, ref.id));
    return entry ? { entry } : { error: `no document with _id "${ref.id}" in pack "${pack}"` };
  }
  if (!ref.name) return { error: "ref needs `name` or `id`" };

  const wantedType = ref.type ? String(ref.type).toLowerCase() : null;
  const matches = (index.byName.get(indexKey(pack, String(ref.name).toLowerCase())) ?? []).filter(
    (entry) => !wantedType || String(entry.doc.type ?? "").toLowerCase() === wantedType
  );
  if (!matches.length) {
    const typeHint = ref.type ? ` of type "${ref.type}"` : "";
    return { error: `no document named "${ref.name}"${typeHint} in pack "${pack}"` };
  }
  if (matches.length > 1) {
    const ids = matches.map((m) => m.doc._id).join(", ");
    return {
      error: `"${ref.name}" is ambiguous in pack "${pack}" (${matches.length} matches: ${ids}); use \`id\``,
    };
  }
  return { entry: matches[0] };
}

/**
 * Expand a document's `item_refs` list into a concrete embedded `items` array.
 *
 * Each entry is either a reference to a document in an already-compiled pack:
 *   - pack: blades68_items
 *     name: Armor            # or `id:` for exact match, `type:` to disambiguate
 *     overrides:             # deep-merged onto the pack document
 *       system: { equipped: true }
 * or a bespoke document that exists nowhere else:
 *   - inline:
 *       name: Getaway drivers
 *       type: cohort
 *
 * Returns { doc, problems }; `doc` keeps everything else untouched and drops
 * `item_refs`. Referenced documents get a stable embedded `_id` and record the
 * source compendium in `_stats.compendiumSource`.
 */
export function resolveItemRefs(doc, { index, scope, loc = "document" } = {}) {
  if (!Array.isArray(doc.item_refs)) return { doc, problems: [] };

  const { item_refs: refs, ...rest } = doc;
  const problems = [];
  const items = Array.isArray(rest.items) ? [...rest.items] : [];

  refs.forEach((ref, i) => {
    const where = `${loc}: item_refs[${i}]`;
    if (!isPlainObject(ref)) {
      problems.push(`${where}: expected a mapping`);
      return;
    }

    if (ref.inline) {
      const inline = structuredClone(ref.inline);
      inline._id = inline._id ?? embeddedItemId(doc._id, "inline", inline.name ?? "", i);
      inline.sort = inline.sort ?? (i + 1) * 100000;
      items.push(inline);
      return;
    }

    const { entry, error } = lookupRef(ref, index);
    if (error) {
      problems.push(`${where}: ${error}`);
      return;
    }

    const { pack, packType, doc: source } = entry;
    const { folder, ownership, permission, _key, ...item } = structuredClone(source);
    const documentClass = PACK_DOCUMENT_CLASS[packType] ?? packType;
    const merged = mergeDeep(item, ref.overrides ?? {});
    merged._id = embeddedItemId(doc._id, pack, source._id, i);
    merged.sort = (i + 1) * 100000;
    merged._stats = {
      ...(merged._stats ?? {}),
      compendiumSource: scope ? `Compendium.${scope}.${pack}.${documentClass}.${source._id}` : null,
    };
    items.push(merged);
  });

  return { doc: { ...rest, items }, problems };
}

/** Dump a Foundry document to YAML with multiline strings as block scalars. */
export function dumpDocumentYaml(doc) {
  return yaml.dump(doc, {
    lineWidth: 100,
    noRefs: true,
    sortingKeys: false,
    styles: {
      "!!str": "literal",
    },
  });
}

/**
 * Prefer literal block style only for multiline / long command-like strings.
 * js-yaml's styles map is coarse; post-process via custom type is overkill —
 * dump with default and force literal for known long fields when present.
 */
export function dumpDocumentYamlSmart(doc) {
  return yaml.dump(doc, {
    lineWidth: 120,
    noRefs: true,
    sortingKeys: false,
  });
}
