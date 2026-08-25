import { loadPdfDocument } from '../pdf-import/pdf-loader.js';
import { parseFactionRolodex, parseFactionDetails, mergeFactionData } from '../pdf-import/faction-parser.js';
import { parsePlaybookSheets } from '../pdf-import/playbook-parser.js';
import { extractDeckCardImages, uploadImageBlob, uploadJson } from '../pdf-import/card-image-extractor.js';
import { createFactionItems, createPlaybookItems, createCardsDeck } from '../pdf-import/create-documents.js';
import { classifyCardDeck, classifyPlaybookPdf } from '../pdf-import/classify-pdf.js';

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
    position: { width: 640, height: 640 },
    actions: {
      parseRulebook: PdfImportApp._onParseRulebook
    }
  };

  static PARTS = {
    body: { template: 'systems/blades68/templates/apps/pdf-import.hbs' }
  };

  async _prepareContext(options) {
    return super._prepareContext(options);
  }

  _getFile(name) {
    const input = this.element.querySelector(`input[name="${name}"]`);
    return input?.files?.[0] ?? null;
  }

  _getFiles(name) {
    const input = this.element.querySelector(`input[name="${name}"]`);
    return input?.files?.length ? [...input.files] : [];
  }

  _log(message) {
    const log = this.element.querySelector('.pdf-import-log');
    if (!log) return;
    const line = document.createElement('div');
    line.textContent = message;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  static async _onParseRulebook(event, target) {
    const rulebookFile = this._getFile('rulebookFile');
    if (!rulebookFile) {
      ui.notifications.warn(game.i18n.localize('BLADES68.PdfImport.NeedRulebook'));
      return;
    }

    target.disabled = true;
    this._log(game.i18n.localize('BLADES68.PdfImport.Parsing'));

    try {
      await this._importFactions(rulebookFile);
      await this._importPlaybooksIfPresent('playbooksFile');
      await this._importPlaybooksIfPresent('crewPlaybooksFile');
      await this._importCardDecks();
      this._log(game.i18n.localize('BLADES68.PdfImport.FullImportDone'));
      ui.notifications.info(game.i18n.localize('BLADES68.PdfImport.FullImportDone'));
    } catch (err) {
      console.error(err);
      this._log(`Error: ${err.message}`);
    } finally {
      target.disabled = false;
    }
  }

  async _importFactions(rulebookFile) {
    const { rolodexStart, rolodexEnd, detailsStart, detailsEnd } = DEFAULT_FACTION_PAGES;
    const pdfDoc = await loadPdfDocument(rulebookFile);
    const rolodex = await parseFactionRolodex(pdfDoc, rolodexStart, rolodexEnd);
    const details = await parseFactionDetails(pdfDoc, detailsStart, detailsEnd);
    const factions = mergeFactionData(rolodex, details);
    this._log(game.i18n.format('BLADES68.PdfImport.ParsedFactions', { count: factions.length }));

    await uploadJson(factions, 'factions.json');
    this._log(game.i18n.localize('BLADES68.PdfImport.SavedParsed'));

    const deckFile = this._getFile('deckFile');
    if (deckFile) {
      this._log(game.i18n.localize('BLADES68.PdfImport.ExtractingArt'));
      const deckPdf = await loadPdfDocument(deckFile);
      const deckImages = await extractDeckCardImages(deckPdf);
      this._log(game.i18n.format('BLADES68.PdfImport.ExtractedArt', { count: deckImages.length }));

      this._log(game.i18n.localize('BLADES68.PdfImport.UploadingArt'));
      for (let index = 0; index < factions.length; index++) {
        const image = deckImages[index];
        if (!image) break;
        const filename = `${factions[index].name.replace(/[^a-z0-9]+/gi, '_')}.png`;
        factions[index].imagePath = await uploadImageBlob(image.blob, filename, 'factions');
      }
    }

    this._log(game.i18n.localize('BLADES68.PdfImport.CreatingItems'));
    const created = await createFactionItems(factions);
    this._log(game.i18n.format('BLADES68.PdfImport.CreatedItems', { count: created.length }));
  }

  async _importPlaybooksIfPresent(inputName) {
    const file = this._getFile(inputName);
    if (!file) return;

    this._log(game.i18n.localize('BLADES68.PdfImport.Parsing'));
    const pdfDoc = await loadPdfDocument(file);
    const playbooks = await parsePlaybookSheets(pdfDoc);
    this._log(game.i18n.format('BLADES68.PdfImport.ParsedPlaybooks', { count: playbooks.length }));

    const { kind, playbookType, abilityType } = classifyPlaybookPdf(file.name);
    await uploadJson(playbooks, kind === 'crew' ? 'crew-playbooks.json' : 'playbooks.json');

    const created = await createPlaybookItems(playbooks, { playbookType, abilityType });
    this._log(game.i18n.format('BLADES68.PdfImport.CreatedItems', { count: created.length }));
  }

  async _importCardDecks() {
    const files = this._getFiles('cardDeckFile');
    for (const file of files) {
      const { deckName, subdir } = classifyCardDeck(file.name);
      this._log(game.i18n.format('BLADES68.PdfImport.ExtractingDeck', { name: deckName }));

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
    }
  }
}
