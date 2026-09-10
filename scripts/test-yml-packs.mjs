#!/usr/bin/env node
/**
 * Unit tests for lossless YAML pack compile/extract helpers.
 * Run: node --test scripts/test-yml-packs.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  folderSlug,
  docSlug,
  packPlacement,
  findPackManifests,
  loadPackDocuments,
  writeNedb,
  readNedb,
  dumpDocumentYamlSmart,
  buildPackIndex,
  resolveItemRefs,
  embeddedItemId,
  mergeDeep,
  PACK_MANIFEST,
} from "./lib/yml-packs.mjs";
import { compileYmlPacks } from "./build-yml-packs.mjs";
import yaml from "js-yaml";

test("packPlacement uses nested packFolders leaves", () => {
  const placement = packPlacement({
    packs: [
      { name: "class", label: "Classes", type: "Item", path: "./packs/classes.db" },
      { name: "blades68_classes", label: "Playbooks", type: "Item", path: "./packs/blades68_classes.db" },
    ],
    packFolders: [
      {
        name: "Blades in the Dark",
        packs: [],
        folders: [{ name: "Character Options", packs: ["class"] }],
      },
      { name: "Blades '68 Content", packs: ["blades68_classes"] },
    ],
  });
  assert.equal(placement.get("class").folderLabel, "Character Options");
  assert.equal(placement.get("class").folderSlug, "character_options");
  assert.equal(placement.get("class").game, "blades_in_the_dark");
  assert.equal(placement.get("blades68_classes").folderSlug, "blades_68_content");
});

test("folderSlug mirrors sidebar names", () => {
  assert.equal(folderSlug("Character Options"), "character_options");
  assert.equal(folderSlug("Factions & NPCs"), "factions_and_npcs");
  assert.equal(folderSlug("Blades '68 Content"), "blades_68_content");
  assert.equal(folderSlug("Blades68 Engine"), "blades68_engine");
});

test("docSlug is filesystem-safe", () => {
  assert.equal(docSlug("Smash & Grab"), "smash-grab");
  assert.equal(docSlug("Foo", "abc"), "foo--abc");
});

test("writeNedb sorts by _id and is deterministic", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "yml-packs-"));
  const file = path.join(dir, "t.db");
  writeNedb(file, [
    { _id: "b", name: "B" },
    { _id: "a", name: "A" },
  ]);
  writeNedb(file, [
    { _id: "a", name: "A" },
    { _id: "b", name: "B" },
  ]);
  const once = fs.readFileSync(file, "utf8");
  writeNedb(file, [
    { _id: "b", name: "B" },
    { _id: "a", name: "A" },
  ]);
  assert.equal(fs.readFileSync(file, "utf8"), once);
  assert.deepEqual(readNedb(file).map((d) => d._id), ["a", "b"]);
});

test("loadPackDocuments accepts multi-document YAML in one file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "yml-packs-"));
  fs.writeFileSync(
    path.join(dir, "many.yml"),
    [
      "name: First",
      "_id: id1",
      "type: item",
      "---",
      "name: Second",
      "_id: id2",
      "type: item",
      "",
    ].join("\n")
  );
  const { docs, problems } = loadPackDocuments(dir);
  assert.deepEqual(problems, []);
  assert.deepEqual(docs.map((d) => d._id), ["id1", "id2"]);
});

test("loadPackDocuments rejects missing _id and duplicates", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "yml-packs-"));
  fs.writeFileSync(path.join(dir, "ok.yml"), "name: Ok\n_id: id1\ntype: item\n");
  fs.writeFileSync(path.join(dir, "bad.yml"), "name: Bad\ntype: item\n");
  fs.writeFileSync(path.join(dir, "dup.yml"), "name: Dup\n_id: id1\ntype: item\n");
  const { docs, problems } = loadPackDocuments(dir);
  assert.equal(docs.length, 1);
  assert.ok(problems.some((p) => p.includes("missing required `_id`")));
  assert.ok(problems.some((p) => p.includes("duplicate _id")));
});

test("Runaways ships its abilities and crew upgrades", () => {
  const contentDir = path.join(
    process.cwd(),
    "yml_source",
    "blades68",
    "blades_68_content"
  );
  const abilities = loadPackDocuments(path.join(contentDir, "blades68_crew_abilities")).docs;
  const upgrades = loadPackDocuments(path.join(contentDir, "blades68_crew_upgrades")).docs;

  const runawayAbilities = abilities
    .filter((doc) => doc.system?.class === "Runaways")
    .map((doc) => doc.name)
    .sort();
  assert.deepEqual(runawayAbilities, [
    "Burn It All",
    "Calculated Risk",
    "Echo Position",
    "Mutants",
    "Public Enemies",
    "Scatter",
    "Vanishing Point",
  ]);

  const runawayUpgrades = upgrades
    .filter((doc) => doc.system?.crew_type === "Runaways")
    .map((doc) => doc.name)
    .sort();
  assert.deepEqual(runawayUpgrades, [
    "Acclimated (+1 key/deadlock)",
    "Elite Hustlers",
    "Elite Infiltrators",
    "Runaway Rig (2 free load for docs or supplies)",
  ]);
});

test("dump/load round-trip preserves fields including multiline command", () => {
  const doc = {
    _id: "abc123",
    name: "Test Macro",
    type: "script",
    command: "const x = 1;\nconsole.log(x);\n",
    flags: { nested: { a: 1 } },
    ownership: { default: 0 },
  };
  const text = dumpDocumentYamlSmart(doc);
  const loaded = yaml.load(text);
  assert.deepEqual(loaded, doc);
});

test("compileYmlPacks discovers manifests and emits lossless NeDB", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "yml-compile-"));
  const packsDir = path.join(root, "packs");
  const sourceDir = path.join(root, "yml_source");
  fs.mkdirSync(packsDir, { recursive: true });

  const system = {
    packs: [
      {
        name: "demo",
        label: "Demo",
        type: "Item",
        path: "./packs/demo.db",
      },
    ],
    packFolders: [{ name: "Character Options", packs: ["demo"] }],
  };
  fs.writeFileSync(path.join(root, "system.json"), JSON.stringify(system));

  const packDir = path.join(sourceDir, "blades_in_the_dark", "character_options", "demo");
  fs.mkdirSync(packDir, { recursive: true });
  fs.writeFileSync(
    path.join(packDir, PACK_MANIFEST),
    ["name: demo", "label: Demo", 'type: Item', "path: ./packs/demo.db", ""].join("\n")
  );
  const doc = {
    _id: "zz99",
    name: "Widget",
    type: "item",
    system: { description: "hello", extra: { keep: true } },
    flags: { x: 1 },
  };
  fs.writeFileSync(path.join(packDir, "widget.yml"), dumpDocumentYamlSmart(doc));

  assert.equal(findPackManifests(sourceDir).length, 1);

  const { built, problems } = compileYmlPacks({ root, sourceDir, packsDir });
  assert.deepEqual(problems, []);
  assert.equal(built.get("demo").count, 1);
  const out = readNedb(path.join(packsDir, "demo.db"));
  assert.deepEqual(out[0], doc);
});

test("compileYmlPacks fails when system.json pack missing from YAML", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "yml-compile-miss-"));
  const packsDir = path.join(root, "packs");
  const sourceDir = path.join(root, "yml_source");
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.writeFileSync(
    path.join(root, "system.json"),
    JSON.stringify({
      packs: [{ name: "missing", label: "Missing", type: "Item", path: "./packs/missing.db" }],
      packFolders: [{ name: "Character Options", packs: ["missing"] }],
    })
  );
  const { problems } = compileYmlPacks({ root, sourceDir, packsDir });
  assert.ok(problems.some((p) => p.includes('pack "missing" has no YAML source')));
});

const REF_INDEX = buildPackIndex([
  {
    name: "gear",
    type: "Item",
    docs: [
      {
        _id: "armor01",
        name: "Armor",
        type: "item",
        system: { description: "plates", load: "1", uses: 3 },
        folder: null,
        ownership: { default: 0 },
      },
      { _id: "twin01", name: "Twin", type: "item", system: { load: "1" } },
      { _id: "twin02", name: "Twin", type: "ability", system: {} },
    ],
  },
]);

test("resolveItemRefs reuses pack documents and applies overrides", () => {
  const { doc, problems } = resolveItemRefs(
    {
      _id: "actor01",
      name: "Example",
      type: "character",
      item_refs: [{ pack: "gear", name: "Armor", overrides: { system: { uses_used: 2, equipped: true } } }],
    },
    { index: REF_INDEX, scope: "blades68" }
  );

  assert.deepEqual(problems, []);
  assert.equal(doc.item_refs, undefined);
  assert.equal(doc.items.length, 1);
  const item = doc.items[0];
  assert.equal(item.name, "Armor");
  // pack fields survive, overrides land on top, world-only fields are dropped
  assert.equal(item.system.description, "plates");
  assert.equal(item.system.uses, 3);
  assert.equal(item.system.uses_used, 2);
  assert.equal(item.system.equipped, true);
  assert.ok(!("folder" in item));
  assert.ok(!("ownership" in item));
  assert.equal(item._stats.compendiumSource, "Compendium.blades68.gear.Item.armor01");
  assert.equal(item._id, embeddedItemId("actor01", "gear", "armor01", 0));
});

test("resolveItemRefs keeps inline documents and orders items by ref position", () => {
  const { doc, problems } = resolveItemRefs(
    {
      _id: "actor01",
      name: "Example",
      item_refs: [
        { pack: "gear", name: "Armor" },
        { inline: { name: "Getaway drivers", type: "cohort", system: { cohort: "Gang" } } },
      ],
    },
    { index: REF_INDEX, scope: "blades68" }
  );

  assert.deepEqual(problems, []);
  assert.deepEqual(doc.items.map((i) => i.name), ["Armor", "Getaway drivers"]);
  assert.deepEqual(doc.items.map((i) => i.sort), [100000, 200000]);
  assert.equal(doc.items[1]._stats, undefined);
  assert.ok(doc.items[1]._id);
});

test("resolveItemRefs reports unknown and ambiguous references", () => {
  const { problems } = resolveItemRefs(
    {
      _id: "actor01",
      name: "Example",
      item_refs: [
        { pack: "gear", name: "Nonesuch" },
        { pack: "gear", name: "Twin" },
        { pack: "gear", name: "Twin", type: "ability" },
        { pack: "gear", id: "nope" },
      ],
    },
    { index: REF_INDEX, scope: "blades68" }
  );

  assert.equal(problems.length, 3);
  assert.ok(problems[0].includes('no document named "Nonesuch"'));
  assert.ok(problems[1].includes("ambiguous"));
  assert.ok(problems[2].includes('no document with _id "nope"'));
});

test("mergeDeep merges objects and replaces arrays", () => {
  const base = { a: { b: 1, c: 2 }, list: [1, 2] };
  const out = mergeDeep(base, { a: { c: 3 }, list: [9] });
  assert.deepEqual(out, { a: { b: 1, c: 3 }, list: [9] });
  assert.deepEqual(base, { a: { b: 1, c: 2 }, list: [1, 2] });
});

test("compileYmlPacks compiles build_order: last packs after the rest", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "yml-compile-last-"));
  const packsDir = path.join(root, "packs");
  const sourceDir = path.join(root, "yml_source");
  fs.mkdirSync(packsDir, { recursive: true });
  fs.writeFileSync(
    path.join(root, "system.json"),
    JSON.stringify({
      id: "blades68",
      packs: [
        { name: "gear", label: "Gear", type: "Item", path: "./packs/gear.db" },
        { name: "examples", label: "Examples", type: "Actor", path: "./packs/examples.db" },
      ],
      packFolders: [{ name: "Blades '68 Content", packs: ["gear", "examples"] }],
    })
  );

  // "examples" sorts before "gear" on disk, so only build_order can fix the order.
  const gearDir = path.join(sourceDir, "blades68", "blades_68_content", "gear");
  fs.mkdirSync(gearDir, { recursive: true });
  fs.writeFileSync(
    path.join(gearDir, PACK_MANIFEST),
    ["name: gear", "label: Gear", "type: Item", "path: ./packs/gear.db", ""].join("\n")
  );
  fs.writeFileSync(
    path.join(gearDir, "armor.yml"),
    dumpDocumentYamlSmart({ _id: "armor01", name: "Armor", type: "item", system: { load: "1" } })
  );

  const exDir = path.join(sourceDir, "blades68", "blades_68_content", "examples");
  fs.mkdirSync(exDir, { recursive: true });
  fs.writeFileSync(
    path.join(exDir, PACK_MANIFEST),
    [
      "name: examples",
      "label: Examples",
      "type: Actor",
      "path: ./packs/examples.db",
      'build_order: "last"',
      "",
    ].join("\n")
  );
  fs.writeFileSync(
    path.join(exDir, "scoundrel.yml"),
    dumpDocumentYamlSmart({
      _id: "actor01",
      name: "Scoundrel",
      type: "character",
      item_refs: [{ pack: "gear", name: "Armor", overrides: { system: { equipped: true } } }],
    })
  );

  const { built, problems } = compileYmlPacks({ root, sourceDir, packsDir });
  assert.deepEqual(problems, []);
  assert.deepEqual([...built.keys()], ["gear", "examples"]);
  const [actor] = readNedb(path.join(packsDir, "examples.db"));
  assert.equal(actor.items.length, 1);
  assert.equal(actor.items[0].system.load, "1");
  assert.equal(actor.items[0].system.equipped, true);
  assert.equal(actor.items[0]._stats.compendiumSource, "Compendium.blades68.gear.Item.armor01");
});

test("compileYmlPacks rejects a build_order: last pack with a dangling reference", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "yml-compile-dangling-"));
  const packsDir = path.join(root, "packs");
  const sourceDir = path.join(root, "yml_source");
  fs.mkdirSync(packsDir, { recursive: true });
  fs.writeFileSync(
    path.join(root, "system.json"),
    JSON.stringify({
      id: "blades68",
      packs: [{ name: "examples", label: "Examples", type: "Actor", path: "./packs/examples.db" }],
      packFolders: [{ name: "Blades '68 Content", packs: ["examples"] }],
    })
  );
  const exDir = path.join(sourceDir, "blades68", "blades_68_content", "examples");
  fs.mkdirSync(exDir, { recursive: true });
  fs.writeFileSync(
    path.join(exDir, PACK_MANIFEST),
    [
      "name: examples",
      "label: Examples",
      "type: Actor",
      "path: ./packs/examples.db",
      'build_order: "last"',
      "",
    ].join("\n")
  );
  fs.writeFileSync(
    path.join(exDir, "scoundrel.yml"),
    dumpDocumentYamlSmart({
      _id: "actor01",
      name: "Scoundrel",
      type: "character",
      item_refs: [{ pack: "gear", name: "Armor" }],
    })
  );

  const { built, problems } = compileYmlPacks({ root, sourceDir, packsDir });
  assert.ok(problems.some((p) => p.includes('no document named "Armor" in pack "gear"')));
  assert.equal(built.has("examples"), false);
});

test("example actors reuse compendium documents instead of copying them", () => {
  const exampleDir = path.join(
    process.cwd(),
    "yml_source",
    "blades68",
    "blades_68_examples",
    "blades68_example_characters"
  );
  const { docs, problems } = loadPackDocuments(exampleDir);
  assert.deepEqual(problems, []);
  assert.deepEqual(docs.map((d) => d.type).sort(), ["character", "crew"]);

  for (const doc of docs) {
    assert.ok(doc.item_refs?.length, `${doc.name} should declare item_refs`);
    // Only the bespoke cohort may be inlined; everything else is a reference.
    const inlined = doc.item_refs.filter((ref) => ref.inline).map((ref) => ref.inline.type);
    assert.ok(inlined.every((type) => type === "cohort"), `${doc.name} inlines ${inlined.join(", ")}`);
    for (const ref of doc.item_refs.filter((r) => !r.inline)) {
      assert.ok(ref.pack, `${doc.name}: ref missing pack`);
      assert.ok(ref.name || ref.id, `${doc.name}: ref missing name/id`);
    }
  }
});
