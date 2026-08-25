import { BLADES68 } from '../config.js';
import { rollAction, rollFlatPool, rollFortune } from '../dice/roll-engine.js';
import { promptActionRoll, promptDicePoolSize } from '../dice/roll-dialog.js';
import { enrichSystemHtml } from '../utils/enrich-html.js';

const { ActorSheetV2 } = foundry.applications.sheets;
const HbsAppMixin = foundry.applications.api.HandlebarsApplicationMixin;

export default class Blades68ActorSheet extends HbsAppMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ['blades68', 'sheet', 'actor'],
    position: { width: 760, height: 820 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      setRating: this._onSetRating,
      addArrayItem: this._onAddArrayItem,
      deleteArrayItem: this._onDeleteArrayItem,
      rollAction: this._onRollAction,
      rollFortune: this._onRollFortune,
      addClock: this._onAddClock,
      deleteClock: this._onDeleteClock,
      setClockValue: this._onSetClockValue,
      toggleClockShared: this._onToggleClockShared,
      toggleCarried: this._onToggleCarried,
      createItem: this._onCreateItem,
      openItem: this._onOpenItem
    }
  };

  static async _onSetRating(event, target) {
    const path = target.dataset.path;
    const clicked = Number(target.dataset.value);
    const current = foundry.utils.getProperty(this.document, path) ?? 0;
    const value = current === clicked ? clicked - 1 : clicked;
    await this.document.update({ [path]: value });
  }

  static async _onAddArrayItem(event, target) {
    const path = target.dataset.path;
    const array = foundry.utils.getProperty(this.document, path) ?? [];
    const newValue = target.dataset.newValue ? JSON.parse(target.dataset.newValue) : '';
    await this.document.update({ [path]: [...array, newValue] });
  }

  static async _onDeleteArrayItem(event, target) {
    const path = target.dataset.path;
    const index = Number(target.dataset.index);
    const array = foundry.utils.getProperty(this.document, path) ?? [];
    await this.document.update({ [path]: array.filter((_, i) => i !== index) });
  }

  static async _onRollAction(event, target) {
    const { attribute, actionKey } = target.dataset;
    const rating =
      attribute && actionKey
        ? this.actor.system.attributes?.[attribute]?.actions?.[actionKey] ?? 0
        : this.actor.system.actionRating ?? 0;

    const title = attribute && actionKey
      ? game.i18n.format('BLADES68.Chat.ActionRollTitle', {
          action: game.i18n.localize(`BLADES68.Action.${actionKey}`)
        })
      : game.i18n.localize('BLADES68.Chat.ActionRollGenericTitle');

    const choice = await promptActionRoll({ title, rating });
    if (!choice) return;

    if (attribute && actionKey) {
      await rollAction({ actor: this.actor, attribute, actionKey, ...choice });
    } else {
      await rollFlatPool({ actor: this.actor, ...choice });
    }
  }

  static async _onRollFortune(event, target) {
    const poolSize = await promptDicePoolSize(1);
    if (poolSize === null) return;
    await rollFortune({ actor: this.actor, poolSize });
  }

  static async _onToggleCarried(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    await item.update({ 'system.carried': !item.system.carried });
  }

  static async _onCreateItem(event, target) {
    const type = target.dataset.type;
    if (!type) return;
    const [item] = await this.actor.createEmbeddedDocuments('Item', [
      { name: game.i18n.localize(`TYPES.Item.${type}`), type }
    ]);
    await item?.sheet.render(true);
  }

  static async _onOpenItem(event, target) {
    this.actor.items.get(target.dataset.itemId)?.sheet.render(true);
  }

  static async _onAddClock(event, target) {
    await this.actor.createEmbeddedDocuments('Item', [
      { name: game.i18n.localize('BLADES68.NewClock'), type: 'clock' }
    ]);
  }

  static async _onDeleteClock(event, target) {
    await this.actor.items.get(target.dataset.itemId)?.delete();
  }

  static async _onSetClockValue(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const clicked = Number(target.dataset.value);
    const value = item.system.value === clicked ? clicked - 1 : clicked;
    await item.update({ 'system.value': value });
  }

  static async _onToggleClockShared(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    await item.update({ 'system.shared': !item.system.shared });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.actor;
    context.system = this.actor.system;
    context.items = this.actor.items;
    context.config = BLADES68;
    context.clocks = this.actor.items.filter((item) => item.type === 'clock');
    context.systemFields = this.actor.system.schema.fields;
    context.enriched = await enrichSystemHtml(this.actor);
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this._activateTabs();
  }

  _activateTabs() {
    const root = this.element;
    const navLinks = root.querySelectorAll('.sheet-tabs a');
    const tabs = root.querySelectorAll('.tab');
    if (!navLinks.length || !tabs.length) return;

    const activate = (tabId) => {
      navLinks.forEach((link) => link.classList.toggle('active', link.dataset.tab === tabId));
      tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === tabId));
      this._syncDuplicateNames();
    };

    for (const link of navLinks) {
      link.addEventListener('click', () => activate(link.dataset.tab));
    }

    const current =
      root.querySelector('.sheet-tabs a.active')?.dataset.tab ?? navLinks[0]?.dataset.tab;
    activate(current);
  }

  /** Strip name attrs from inactive tabs that share a dupe-group so FormData stays clean. */
  _syncDuplicateNames() {
    const root = this.element;
    const groups = new Set(
      [...root.querySelectorAll('.tab[data-dupe-group]')].map((t) => t.dataset.dupeGroup)
    );
    for (const group of groups) {
      const tabs = root.querySelectorAll(`.tab[data-dupe-group="${group}"]`);
      for (const tab of tabs) {
        const named = tab.querySelectorAll('[name], [data-name]');
        if (tab.classList.contains('active')) {
          for (const el of named) {
            if (el.dataset.name && !el.getAttribute('name')) {
              el.setAttribute('name', el.dataset.name);
            }
          }
        } else {
          for (const el of named) {
            const name = el.getAttribute('name');
            if (name) {
              el.dataset.name = name;
              el.removeAttribute('name');
            }
          }
        }
      }
    }
  }
}
