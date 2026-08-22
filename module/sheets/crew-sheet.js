import Blades68ActorSheet from './base-actor-sheet.js';

export default class CrewSheet extends Blades68ActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['crew']
  };

  static PARTS = {
    body: { template: 'systems/blades68/templates/actor/crew-sheet.hbs' }
  };
}
