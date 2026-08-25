import { BLADES68 } from './config.js';

import Blades68Actor from './documents/actor.js';
import Blades68Item from './documents/item.js';

import CharacterData from './data/actor/character.js';
import NpcData from './data/actor/npc.js';
import CrewData from './data/actor/crew.js';

import FactionData from './data/item/faction.js';
import PlaybookData from './data/item/playbook.js';
import AbilityData from './data/item/ability.js';
import HeritageData from './data/item/heritage.js';
import ViceData from './data/item/vice.js';
import GearData from './data/item/gear.js';
import ContactData from './data/item/contact.js';
import CrewPlaybookData from './data/item/crew-playbook.js';
import CrewAbilityData from './data/item/crew-ability.js';
import UpgradeData from './data/item/upgrade.js';
import CohortData from './data/item/cohort.js';
import ClaimData from './data/item/claim.js';
import ClockData from './data/item/clock.js';

import CharacterSheet from './sheets/character-sheet.js';
import NpcSheet from './sheets/npc-sheet.js';
import CrewSheet from './sheets/crew-sheet.js';
import FactionSheet from './sheets/faction-sheet.js';
import Blades68ItemSheet from './sheets/item-sheet.js';

import registerHandlebarsHelpers from './utils/register-helpers.js';
import preloadHandlebarsTemplates from './templates.js';
import FactionTrackerApp from './apps/faction-tracker.js';
import ClockTrackerApp, { registerTrackerRefreshHooks } from './apps/clock-tracker.js';
import PdfImportApp from './apps/pdf-import-app.js';
import { registerPlaybookGearHooks } from './utils/playbook-gear.js';

const { Actors, Items } = foundry.documents.collections;

Hooks.once('init', () => {
  CONFIG.Actor.documentClass = Blades68Actor;
  CONFIG.Item.documentClass = Blades68Item;

  Object.assign(CONFIG.Actor.dataModels, {
    character: CharacterData,
    npc: NpcData,
    crew: CrewData
  });

  Object.assign(CONFIG.Item.dataModels, {
    faction: FactionData,
    playbook: PlaybookData,
    ability: AbilityData,
    heritage: HeritageData,
    vice: ViceData,
    gear: GearData,
    contact: ContactData,
    'crew-playbook': CrewPlaybookData,
    'crew-ability': CrewAbilityData,
    upgrade: UpgradeData,
    cohort: CohortData,
    claim: ClaimData,
    clock: ClockData
  });

  registerHandlebarsHelpers();
  preloadHandlebarsTemplates();

  Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet);
  Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet);

  const actorSheetClassMap = {
    character: CharacterSheet,
    npc: NpcSheet,
    crew: CrewSheet
  };

  for (const [actorType, SheetClass] of Object.entries(actorSheetClassMap)) {
    Actors.registerSheet(BLADES68.ID, SheetClass, {
      makeDefault: true,
      label: `BLADES68.Sheet.${actorType}`,
      types: [actorType]
    });
  }

  Items.registerSheet(BLADES68.ID, Blades68ItemSheet, {
    makeDefault: true,
    label: 'BLADES68.Sheet.item',
    types: Object.keys(CONFIG.Item.dataModels).filter((type) => type !== 'faction')
  });

  Items.registerSheet(BLADES68.ID, FactionSheet, {
    makeDefault: true,
    label: 'BLADES68.Sheet.faction',
    types: ['faction']
  });

  game.blades68 = {
    BLADES68,
    Blades68Actor,
    Blades68Item,
    FactionTrackerApp,
    ClockTrackerApp,
    PdfImportApp,
    openFactionTracker: () => new FactionTrackerApp().render(true),
    openClockTracker: () => new ClockTrackerApp().render(true),
    openPdfImport: () => new PdfImportApp().render(true)
  };

  registerTrackerRefreshHooks();
  registerPlaybookGearHooks();

  game.settings.registerMenu(BLADES68.ID, 'pdfImport', {
    name: 'BLADES68.PdfImport.MenuName',
    label: 'BLADES68.PdfImport.MenuLabel',
    hint: 'BLADES68.PdfImport.MenuHint',
    icon: 'fas fa-file-pdf',
    type: PdfImportApp,
    restricted: true
  });
});

Hooks.on('getSceneControlButtons', (controls) => {
  controls.blades68 = {
    name: 'blades68',
    title: 'BLADES68.SceneControls.Title',
    icon: 'fas fa-network-wired',
    layer: null,
    visible: true,
    tools: {
      factionTracker: {
        name: 'factionTracker',
        title: 'BLADES68.FactionTracker.Title',
        icon: 'fas fa-network-wired',
        button: true,
        onClick: () => game.blades68.openFactionTracker()
      },
      clockTracker: {
        name: 'clockTracker',
        title: 'BLADES68.ClockTracker.Title',
        icon: 'fas fa-clock',
        button: true,
        onClick: () => game.blades68.openClockTracker()
      }
    }
  };
});
