
This repo is both Foundry VTT system, and testing module 

Only the system is built and distributed, but this repo also has quech and cypress - these are used for regression testing. These should be run as you make changes to the repo

Watch: : **on edit → dump into Foundry userdata → Quench in world → Cypress poke Quench 

You will need to setup your
`fvtt.config.js`

| Field | Why |
|---|---|
| `userDataPath` | Folder that **contains** `Data/` (Foundry → Configure Settings → User Data Path). macOS often `~/Library/Application Support/FoundryVTT` or custom `~/foundrydata`. |
| `baseURL` | Cypress hit this (usually `http://localhost:30000`). |
| `testWorldName` | World Cypress launch for Quench. |
| `adminPassword` | Setup `/auth` if set. |
| `quenchManifestUrl` | Install [Quench](https://github.com/Ethaks/FVTT-Quench) into userdata. |
| `testSystemManifestUrl` | Game system for test world (module-only repos). System repos: often `local` / copy into `Data/systems/`. |

`prewatch` / `prebuild` often sync `.env` from this file so Docker bind-mount = same `userDataPath`. Placeholder `YOUR_USERNAME` = fail.
---

I strongly recommend using docker, it makes it easier to reset and restart foundry. 

## manual testing
The **Blades '68 Example Characters** pack gives us a played-in character and crew. Its actors compile last (`build_order: "last"` in `_pack.yml`) and list their gear, abilities and playbook as `item_refs` into the other packs, so the examples stay in sync with the real compendium content instead of holding copies of it.

```yaml
item_refs:
  - pack: blades68_items
    name: Armor
    overrides:
      system: { equipped: true, uses_used: 2 }
```

## `npm run test:ci`

Headless Cypress: `cypress run --headless --browser chrome`.

**Need Foundry already up** with world + Quench + product + test module **enabled.**

**Quench** = in-Foundry Mocha. Real `game` / packs / dice. Cypress = robot: login → open Quench → Run → fail if batch fail or **zero tests ran**.

---

## GitHub workflow release

**Trigger:** push **default branch** (`main` / `master`), sometimes `workflow_dispatch`. Not always git tag.

**Why Foundry care:** install URL = `…/releases/latest/download/module.json`. Manifest `download` must match zip Foundry fetch. `id` must match repo package id or Foundry `PACKAGE.InstallFailed`.

Two flavors here:

### Versioned tag (e.g. modern-names)

1. `npm ci`, bootstrap `fvtt.config.js` for CI, build (compendiums + webpack).
2. Version from `module.json`.
3. Rewrite `manifest` → `releases/latest/download/module.json`, `download` → `releases/download/v<ver>/module.zip`.
4. Zip **without** those two URLs in shipped `module.json` (Foundry rewrite on install).
5. [`ncipollo/release-action`](https://github.com/ncipollo/release-action): `allowUpdates: true`, tag `v<version>`, artifacts `module.json` + `module.zip`.

Same version number on `main` → **overwrite that GitHub Release**. Bump `module.json` version when you want new tag.

### Rolling `latest` (PDF importers, some others)

1. Stamp `version` = `1.0.${GITHUB_RUN_NUMBER}` (each push new, Foundry see upgrade).
2. Point `manifest` + `download` at **this** `github.repository` `releases/latest/download/…` (hardcoded other-owner URL = install wrong package).
3. `tag: latest`, `allowUpdates: true`, `replacesArtifacts: true`, `makeLatest: true`.

Players stay on **Install Module** latest URL. Each default-branch push replace zip.

`FoundryvttTestEnv` itself = composite action: release on **semver tag**, float major tag (`@0`), no `module.zip`.