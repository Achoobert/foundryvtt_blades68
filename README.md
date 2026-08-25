# Blades68

A Foundry VTT system for **Blades68**, a Forged in the Dark hack featuring the Trouble Engine (GM-side city/faction/clock tracking), Keys & Deadlocks (XP and stress mechanics), and reimagined playbooks like the Swinger, Operative, Paranormalist, and Radical.

Built against modern Foundry APIs (v13 minimum, v14 verified): DataModel-driven Actors/Items declared via `system.json`'s `documentTypes` (no `template.json`), and ApplicationV2/`HandlebarsApplicationMixin` sheets throughout.

## What's here

- **Actors**: `character` (PC), `npc`, `crew`
- **Items**: `faction`, `playbook`, `ability`, `heritage`, `vice`, `gear`, `contact`, `crew-playbook`, `crew-ability`, `upgrade`, `cohort`, `claim`, `clock`
- **Factions are Items**, so an NPC can point at one: the NPC sheet stores a `system.factionUuid` reference to the canonical faction rather than a copy, and a faction's project clocks live as world-level `clock` Items flagged with the owning faction's uuid (Foundry Items cannot embed Items)
- **Dice engine** (`module/dice/`): action rolls, resistance rolls, and fortune rolls on the standard Forged-in-the-Dark dice pool (highest die wins, 6+6 crits, 0-dice rolls 2d6 keep-lowest)
- **Clocks**: embeddable `clock` items with an SVG wedge widget, plus a standalone Clock Tracker app that surfaces any clock marked "shared" across all actors
- **Faction Tracker**: a standalone app grouping all `faction` items by category (Underworld/Institutions/Corporate/Citizenry/Fringe), matching the tabletop Factions-of-Doskvol tracker sheet
- **Compendiums**: sample playbooks/items/factions and starter Trouble Deck / Faction Deck roll tables (minimal content — full SRD transcription is a later pass; see `rule_books/`)
- **Tests**: Quench batches (`tests/quench/`) covering data models, dice math, clocks, and sheet rendering, driven by a Cypress harness (`tests/e2e/`) against a live Foundry instance

## Local dev setup

This targets a local Foundry container at `~/tools/local_containers/foundry_14` (a `felddy/foundryvtt:14` image bound to `~/foundrydata`). Only one Foundry instance can run against that data directory at a time — see the note below on switching worlds.

```sh
npm install
npm run dev
```

`npm run dev` will:

1. Compile SCSS → `css/blades68.css`
2. Sync `system.json`, `module/`, `templates/`, `css/`, `lang/`, `assets/`, and compiled `packs/` into `~/foundrydata/Data/systems/blades68`
3. Ensure a `blades68` world exists at `~/foundrydata/Data/worlds/blades68` (skipped if it already exists — it does, once you've created one)
4. Sync the Quench test module into `~/foundrydata/Data/modules/blades68-quench-tests`

Then start (or point) the container at the `blades68` world:

```sh
~/tools/local_containers/foundry_14/up.sh
```

If the container is already running a different world, you'll need to switch it — set `FOUNDRY_WORLD=blades68` in that container's environment, or use the in-app "Return to Setup" flow and launch `blades68` from there.

### Compendium content

Source JSON for compendiums lives in `packs-source/<pack>/` (tracked in git); compiled LevelDB packs live in `packs/<pack>/` (gitignored, rebuilt on demand):

```sh
npm run packs:pack     # packs-source/ -> packs/ (what system.json ships)
npm run packs:unpack   # packs/ -> packs-source/ (after editing content in Foundry)
```

Two content-generation scripts under `scripts/` (`gen-sample-tables.mjs`, `gen-sample-content.mjs`) produced the current starter compendiums — they're not idempotent (re-running creates duplicates with fresh IDs), so if you need to regenerate, clear the relevant `packs-source/<pack>/*.json` files first.

## Testing

**Quench** (in-Foundry, Mocha-based): batches live in `tests/quench/batches/` and register on the `quenchReady` hook. They run inside a live world with the `blades68-quench-tests` module and `quench` (from `~/foundrydata/Data/modules/quench`) both enabled.

**Cypress** (drives a live Foundry instance end-to-end):

```sh
cd tests/e2e
npm install
npx cypress install   # first time only — downloads the Cypress binary
FOUNDRY_ADMIN_KEY='<your admin key>' npm run tests:ci
```

`tests/e2e/fvtt.config.js` (gitignored; copy `fvtt.config.example.js` if it's missing) points at `~/foundrydata` and the `blades68` world. The Cypress spec (`cypress/e2e/02-quench.cy.js`) logs in as GM, enables the `quench` and `blades68-quench-tests` modules via `game.settings.set('core', 'moduleConfiguration', ...)` if they aren't already active, runs every registered batch, and fails if anything errors *or* if zero tests ran (a broken registration call can silently yield an empty, "passing" run — the assertion checks for a nonzero `Ran N tests` count, not just the absence of the word "failed").

**Only one Foundry instance can run against `~/foundrydata` at a time.** Running the Cypress suite takes over whatever world the shared container currently has loaded — it doesn't spin up an isolated instance.

## Known gaps

- Compendium content is intentionally minimal (a few sample playbooks/items/factions and starter roll tables) — full transcription from `rule_books/` is a separate future pass, likely via a PDF importer modeled on `coc-pdf-importer` / `delta-green-pdf-importer` / `mosh-pdf-importer`.
- The crew "planning meeting" mini-flow (table opportunity → roll payout → choose score) described in the build plan hasn't been built as a guided dialog yet — crew items/upgrades/cohorts/claims are managed directly on the crew sheet.
- `system.json`'s `manifest`/`download` URLs point at `github.com/Achoobert/blades68`, which doesn't have this content pushed yet — Foundry's update check will log a harmless warning until it does.
