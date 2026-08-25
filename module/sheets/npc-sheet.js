import Blades68ActorSheet from './base-actor-sheet.js';
import { getGroupedFactionChoices, resolveFaction } from '../utils/faction-links.js';
import { resolveDroppedPlaybookName } from '../utils/playbook-drop.js';

export default class NpcSheet extends Blades68ActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['npc'],
    position: { width: 560, height: 680 },
    actions: {
      openFaction: this._onOpenFaction
    }
  };

  static PARTS = {
    body: { template: 'systems/blades68/templates/actor/npc-sheet.hbs' }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.factionChoices = await getGroupedFactionChoices();
    context.faction = resolveFaction(this.actor.system.factionUuid);
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.isEditable) return;

    const zone = this.element.querySelector('[data-drop="playbook"]');
    if (!zone) return;

    zone.addEventListener('dragover', (event) => {
      event.preventDefault();
      zone.classList.add('drop-hover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drop-hover'));
    zone.addEventListener('drop', (event) => this.#onDropPlaybook(event, zone));
  }

  async #onDropPlaybook(event, zone) {
    event.preventDefault();
    zone.classList.remove('drop-hover');
    const name = await resolveDroppedPlaybookName(event);
    if (!name) return;
    await this.actor.update({ 'system.playbook': name });
  }

  static async _onOpenFaction(event, target) {
    const faction = await fromUuid(this.actor.system.factionUuid);
    faction?.sheet.render(true);
  }
}
