import { classifyCardDeck, classifyPlaybookPdf } from '/systems/blades68/module/pdf-import/classify-pdf.js';
import { getOrCreateFolder, getOrCreateFolderPath } from '/systems/blades68/module/pdf-import/folders.js';
import { extractGear } from '/systems/blades68/module/pdf-import/playbook-parser.js';

export default function registerPdfImportBatches(quench) {
  quench.registerBatch('blades68.pdf-import', (context) => {
    const { describe, it, assert, after } = context;
    const createdFolders = [];

    after(async () => {
      for (const folder of createdFolders.reverse()) {
        await folder?.delete({ deleteSubfolders: true, deleteContents: true });
      }
    });

    describe('classifyCardDeck', () => {
      it('maps trouble-deck filenames', () => {
        assert.deepEqual(classifyCardDeck('b68_troubledeck_v1.pdf'), {
          deckName: 'Trouble Deck',
          subdir: 'troubledeck'
        });
      });

      it('maps faction-deck filenames', () => {
        assert.deepEqual(classifyCardDeck('b68_factiondeck_v1.pdf'), {
          deckName: 'Faction Deck',
          subdir: 'factiondeck'
        });
      });

      it('falls back to a slug of the filename', () => {
        assert.deepEqual(classifyCardDeck('custom_oracle.pdf'), {
          deckName: 'custom oracle',
          subdir: 'custom_oracle'
        });
      });
    });

    describe('classifyPlaybookPdf', () => {
      it('treats crew sheets as crew playbooks', () => {
        assert.deepEqual(classifyPlaybookPdf('b68_crewsheets_v6.pdf'), {
          kind: 'crew',
          playbookType: 'crew-playbook',
          abilityType: 'crew-ability'
        });
      });

      it('treats other playbook PDFs as character playbooks', () => {
        assert.deepEqual(classifyPlaybookPdf('b68_playbooks_v6.pdf'), {
          kind: 'character',
          playbookType: 'playbook',
          abilityType: 'ability'
        });
      });
    });

    describe('extractGear', () => {
      it('merges item-row fragments and ignores quantity labels', () => {
        const items = [
          { str: 'ITEMS', x: 648, y: 270 },
          { str: 'Fine', x: 658, y: 251 },
          { str: 'snub-nosed', x: 672, y: 251 },
          { str: 'handcannon', x: 710, y: 251 },
          { str: 'Handcannon', x: 658, y: 155 },
          { str: 'x2', x: 722, y: 155 }
        ];

        assert.deepEqual(extractGear(items), [
          { name: 'Fine snub-nosed handcannon', load: 1 },
          { name: 'Handcannon', load: 2 }
        ]);
      });
    });

    describe('getOrCreateFolder', () => {
      it('creates a folder once and reuses it', async () => {
        const first = await getOrCreateFolder('Quench Import Root', 'Actor');
        createdFolders.push(first);
        const second = await getOrCreateFolder('Quench Import Root', 'Actor');
        assert.equal(second.id, first.id);
      });

      it('nests a folder path and returns the deepest id', async () => {
        const folderId = await getOrCreateFolderPath(['Quench Import Path', 'Factions'], 'Item');
        const folder = game.folders.get(folderId);
        createdFolders.push(folder?.folder);

        assert.equal(folder.name, 'Factions');
        assert.equal(folder.folder?.name, 'Quench Import Path');
      });

      it('puts a created faction item in the folder', async () => {
        const folder = await getOrCreateFolder('Quench Import Items', 'Item');
        createdFolders.push(folder);

        const item = await Item.create({ name: 'Quench Folder Faction', type: 'faction', folder: folder.id });
        assert.equal(item.folder?.id, folder.id);
      });
    });
  });
}
