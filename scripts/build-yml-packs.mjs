#!/usr/bin/env node
/**
 * Compiles lossless YAML under yml_source/ into NeDB packs/*.db.
 *
 * Layout:
 *   yml_source/<game>/<sidebar_folder>/<compendium>/_pack.yml
 *   yml_source/<game>/<sidebar_folder>/<compendium>/<doc>.yml
 *
 * Each _pack.yml must declare name, label, type, path (matching system.json).
 * Document YAML is a full Foundry document; _id and name are required.
 *
 * A pack may declare `build_order: last` to compile after all other packs; its
 * documents can then use `item_refs` to embed documents from those packs
 * instead of duplicating them (see resolveItemRefs in lib/yml-packs.mjs).
 *
 * Run: node scripts/build-yml-packs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  findPackManifests,
  loadPackManifest,
  loadPackDocuments,
  writeNedb,
  loadSystemManifest,
  buildPackIndex,
  resolveItemRefs,
  BUILD_ORDER_LAST,
} from "./lib/yml-packs.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = path.join(ROOT, "yml_source");
const PACKS_DIR = path.join(ROOT, "packs");

export function compileYmlPacks({ root = ROOT, sourceDir = SOURCE_DIR, packsDir = PACKS_DIR } = {}) {
  const system = loadSystemManifest(root);
  const expected = new Map((system.packs ?? []).map((p) => [p.name, p]));
  const problems = [];
  const built = new Map();
  const candidates = [];
  const seenNames = new Set();

  const manifests = findPackManifests(sourceDir);
  if (!manifests.length) {
    problems.push(`No ${path.basename("_pack.yml")} manifests under ${sourceDir}`);
  }

  for (const manifestPath of manifests) {
    let meta;
    try {
      meta = loadPackManifest(manifestPath);
    } catch (err) {
      problems.push(err.message);
      continue;
    }

    const packDir = path.dirname(manifestPath);
    const { docs, problems: docProblems } = loadPackDocuments(packDir);
    problems.push(...docProblems);

    const systemPack = expected.get(meta.name);
    if (!systemPack) {
      problems.push(`${manifestPath}: pack name "${meta.name}" not in system.json packs`);
    } else {
      if (systemPack.label !== meta.label) {
        problems.push(
          `${manifestPath}: label "${meta.label}" != system.json "${systemPack.label}"`
        );
      }
      if (systemPack.type !== meta.type) {
        problems.push(
          `${manifestPath}: type "${meta.type}" != system.json "${systemPack.type}"`
        );
      }
      const norm = (p) => String(p).replace(/^\.\//, "");
      if (norm(systemPack.path) !== norm(meta.path)) {
        problems.push(
          `${manifestPath}: path "${meta.path}" != system.json "${systemPack.path}"`
        );
      }
    }

    if (seenNames.has(meta.name)) {
      problems.push(`${manifestPath}: duplicate pack name "${meta.name}"`);
      continue;
    }
    seenNames.add(meta.name);

    const outRel = String(meta.path).replace(/^\.\//, "");
    const outPath = path.join(root, outRel);
    if (!outPath.startsWith(packsDir) && path.dirname(outPath) !== packsDir) {
      // Allow packsDir override in tests; still require *.db basename.
    }
    if (!outRel.endsWith(".db")) {
      problems.push(`${manifestPath}: path must end with .db`);
      continue;
    }

    if (docProblems.length) continue;

    candidates.push({ manifestPath, meta, outPath, docs });
  }

  // Packs marked `build_order: last` compile after the rest so their documents
  // can pull in already-compiled documents by reference.
  const first = candidates.filter((c) => c.meta.build_order !== BUILD_ORDER_LAST);
  const last = candidates.filter((c) => c.meta.build_order === BUILD_ORDER_LAST);

  for (const { meta, outPath, docs } of first) {
    const written = writeNedb(outPath, docs);
    built.set(meta.name, { path: outPath, count: written.length, meta });
  }

  if (last.length) {
    const index = buildPackIndex(first.map((c) => ({ name: c.meta.name, type: c.meta.type, docs: c.docs })));
    for (const { manifestPath, meta, outPath, docs } of last) {
      const resolved = [];
      let failed = false;
      for (const doc of docs) {
        const { doc: out, problems: refProblems } = resolveItemRefs(doc, {
          index,
          scope: system.id,
          loc: `${manifestPath} (${doc.name})`,
        });
        problems.push(...refProblems);
        if (refProblems.length) failed = true;
        resolved.push(out);
      }
      if (failed) continue;
      const written = writeNedb(outPath, resolved);
      built.set(meta.name, { path: outPath, count: written.length, meta });
    }
  }

  for (const name of expected.keys()) {
    if (!built.has(name)) {
      problems.push(`system.json pack "${name}" has no YAML source under yml_source/`);
    }
  }

  return { built, problems };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const { built, problems } = compileYmlPacks();
  for (const [name, info] of built) {
    console.log(`${name}: ${info.count} docs -> ${path.relative(ROOT, info.path)}`);
  }
  if (problems.length) {
    console.error(`\n${problems.length} problem(s):`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`Done: ${built.size} packs.`);
}
