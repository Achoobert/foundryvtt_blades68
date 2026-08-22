import { loadPdfDocument } from '../pdf-import/pdf-loader.js';
import { parseFactionRolodex, parseFactionDetails, mergeFactionData } from '../pdf-import/faction-parser.js';
import { parsePlaybookSheets } from '../pdf-import/playbook-parser.js';
import { extractDeckCardImages, uploadImageBlob } from '../pdf-import/card-image-extractor.js';
import { createFactionActors, createPlaybookItems, createCardsDeck } from '../pdf-import/create-documents.js';

// The rulebook's Faction chapter has a fixed layout (there is only one
// official rulebook, and its pagination doesn't change): pages 353-355 are
// the short Rolodex entries, 356-395 are the full per-faction dossiers.
const DEFAULT_FACTION_PAGES = { rolodexStart: 353, rolodexEnd: 355, detailsStart: 356, detailsEnd: 395 };

const { ApplicationV2 } = foundry.applications.api;
const HbsAppMixin = foundry.applications.api.HandlebarsApplicationMixin;

export default class PdfImportApp extends HbsAppMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'blades68-pdf-import',
    classes: ['blades68', 'pdf-import'],
    window: { title: 'BLADES68.PdfImport.Title', resizable: true },
    position: { width: 640, height: 760 },
    actions: {
      parseFactions: PdfImportApp._onParseFactions,
      createFactions: PdfImportApp._onCreateFactions,
      extractDeckArt: PdfImportApp._onExtractDeckArt,
      parsePlaybooks: PdfImportApp._onParsePlaybooks,
      createCardsDeck: PdfImportApp._onCreateCardsDeck
    }
  };

  static PARTS = {
    body: { template: 'systems/blades68/templates/apps/pdf-import.hbs' }
  };

  parsedFactions = null;
  deckImages = null;

  async _prepareContext(options) {
    return super._prepareContext(options);
  }

  _getFile(name) {
    const input = this.element.querySelector(`input[name="${name}"]`);
    return input?.files?.[0] ?? null;
  }

  _log(message) {
    const log = this.element.querySelector('.pdf-import-log');
    if (!log) return;
    const line = document.createElement('div');
    line.textContent = message;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  _renderFactionPreview() {
    const container = this.element.querySelector('.faction-preview');
    if (!container) return;
    container.innerHTML = '';

    this.parsedFactions.forEach((faction, index) => {
      const row = document.createElement('div');
      row.className = 'faction-preview-row';

      const label = document.createElement('span');
      label.textContent = `${faction.name} — Tier ${faction.tier} (${faction.category})`;
      row.appendChild(label);

      if (this.deckImages?.length) {
        const select = document.createElement('select');
        select.dataset.factionIndex = String(index);
        select.classList.add('faction-art-select');

        const noneOption = document.createElement('option');
        noneOption.value = '';
        noneOption.textContent = game.i18n.localize('BLADES68.PdfImport.NoArt');
        select.appendChild(noneOption);

        for (const image of this.deckImages) {
          const option = document.createElement('option');
          option.value = String(image.pageNumber);
          option.textContent = `Card ${image.pageNumber}`;
          if (image.pageNumber === index + 1) option.selected = true;
          select.appendChild(option);
        }
        row.appendChild(select);

        if (index < this.deckImages.length) {
          const thumb = document.createElement('img');
          thumb.className = 'faction-art-thumb';
          thumb.src = this.deckImages[index].url;
          row.appendChild(thumb);
        }
      }

      container.appendChild(row);
    });
  }

  static async _onParseFactions(event, target) {
    const rulebookFile = this._getFile('rulebookFile');
    if (!rulebookFile) {
      ui.notifications.warn(game.i18n.localize('BLADES68.PdfImport.NeedRulebook'));
      return;
    }

    const { rolodexStart, rolodexEnd, detailsStart, detailsEnd } = DEFAULT_FACTION_PAGES;

    target.disabled = true;
    this._log(game.i18n.localize('BLADES68.PdfImport.Parsing'));

    try {
      const pdfDoc = await loadPdfDocument(rulebookFile);

      const rolodex = await parseFactionRolodex(pdfDoc, rolodexStart, rolodexEnd);
      const details = await parseFactionDetails(pdfDoc, detailsStart, detailsEnd);

      this.parsedFactions = mergeFactionData(rolodex, details);
      this._log(
        game.i18n.format('BLADES68.PdfImport.ParsedFactions', { count: this.parsedFactions.length })
      );
      this._renderFactionPreview();
      this.element.querySelector('[data-action="createFactions"]').disabled = false;
    } catch (err) {
      console.error(err);
      this._log(`Error: ${err.message}`);
    } finally {
      target.disabled = false;
    }
  }

  static async _onExtractDeckArt(event, target) {
    const deckFile = this._getFile('deckFile');
    if (!deckFile) {
      ui.notifications.warn(game.i18n.localize('BLADES68.PdfImport.NeedDeck'));
      return;
    }

    target.disabled = true;
    this._log(game.i18n.localize('BLADES68.PdfImport.ExtractingArt'));

    try {
      const pdfDoc = await loadPdfDocument(deckFile);
      this.deckImages = await extractDeckCardImages(pdfDoc);
      this._log(game.i18n.format('BLADES68.PdfImport.ExtractedArt', { count: this.deckImages.length }));
      if (this.parsedFactions) this._renderFactionPreview();
    } catch (err) {
      console.error(err);
      this._log(`Error: ${err.message}`);
    } finally {
      target.disabled = false;
    }
  }

  static async _onCreateFactions(event, target) {
    if (!this.parsedFactions?.length) return;
    target.disabled = true;
    this._log(game.i18n.localize('BLADES68.PdfImport.UploadingArt'));

    try {
      if (this.deckImages?.length) {
        const selects = this.element.querySelectorAll('.faction-art-select');
        for (const select of selects) {
          const pageNumber = Number(select.value);
          if (!pageNumber) continue;
          const image = this.deckImages.find((img) => img.pageNumber === pageNumber);
          if (!image) continue;
          const index = Number(select.dataset.factionIndex);
          const filename = `${this.parsedFactions[index].name.replace(/[^a-z0-9]+/gi, '_')}.png`;
          const path = await uploadImageBlob(image.blob, filename, 'factions');
          this.parsedFactions[index].imagePath = path;
        }
      }

      this._log(game.i18n.localize('BLADES68.PdfImport.CreatingActors'));
      const created = await createFactionActors(this.parsedFactions);
      this._log(game.i18n.format('BLADES68.PdfImport.CreatedActors', { count: created.length }));
      ui.notifications.info(game.i18n.format('BLADES68.PdfImport.CreatedActors', { count: created.length }));
    } catch (err) {
      console.error(err);
      this._log(`Error: ${err.message}`);
    } finally {
      target.disabled = false;
    }
  }

  static async _onParsePlaybooks(event, target) {
    const kind = target.dataset.kind; // 'character' | 'crew'
    const inputName = kind === 'crew' ? 'crewPlaybooksFile' : 'playbooksFile';
    const file = this._getFile(inputName);
    if (!file) {
      ui.notifications.warn(game.i18n.localize('BLADES68.PdfImport.NeedPlaybooksFile'));
      return;
    }

    target.disabled = true;
    this._log(game.i18n.localize('BLADES68.PdfImport.Parsing'));

    try {
      const pdfDoc = await loadPdfDocument(file);
      const playbooks = await parsePlaybookSheets(pdfDoc);
      this._log(game.i18n.format('BLADES68.PdfImport.ParsedPlaybooks', { count: playbooks.length }));

      const docTypes = kind === 'crew'
        ? { playbookType: 'crew-playbook', abilityType: 'crew-ability' }
        : { playbookType: 'playbook', abilityType: 'ability' };
      const created = await createPlaybookItems(playbooks, docTypes);
      this._log(game.i18n.format('BLADES68.PdfImport.CreatedItems', { count: created.length }));
    } catch (err) {
      console.error(err);
      this._log(`Error: ${err.message}`);
    } finally {
      target.disabled = false;
    }
  }

  static async _onCreateCardsDeck(event, target) {
    const { deckName, subdir, input } = target.dataset;
    const file = this._getFile(input);
    if (!file) {
      ui.notifications.warn(game.i18n.localize('BLADES68.PdfImport.NeedDeck'));
      return;
    }

    target.disabled = true;
    this._log(game.i18n.format('BLADES68.PdfImport.ExtractingDeck', { name: deckName }));

    try {
      const pdfDoc = await loadPdfDocument(file);
      const images = await extractDeckCardImages(pdfDoc);
      this._log(game.i18n.format('BLADES68.PdfImport.ExtractedArt', { count: images.length }));

      const uploaded = [];
      for (const image of images) {
        const filename = `${subdir}_${String(image.pageNumber).padStart(2, '0')}.png`;
        const path = await uploadImageBlob(image.blob, filename, subdir);
        uploaded.push({ path });
      }

      const deck = await createCardsDeck(deckName, uploaded);
      this._log(game.i18n.format('BLADES68.PdfImport.CreatedDeck', { name: deck.name, count: uploaded.length }));
    } catch (err) {
      console.error(err);
      this._log(`Error: ${err.message}`);
    } finally {
      target.disabled = false;
    }
  }
}
