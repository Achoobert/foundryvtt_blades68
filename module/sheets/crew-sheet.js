import Blades68ActorSheet from './base-actor-sheet.js';
import { plainTextFromHtml } from '../utils/plain-text.js';

export default class CrewSheet extends Blades68ActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['crew']
  };

  static PARTS = {
    body: { template: 'systems/blades68/templates/actor/crew-sheet.hbs' }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.crewAbilityItems = this.actor.items
      .filter((item) => item.type === 'crew-ability')
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: item.system.description,
        descriptionText: plainTextFromHtml(item.system.description)
      }));
    return context;
  }
}
