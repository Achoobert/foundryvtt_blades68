import Blades68ActorSheet from './base-actor-sheet.js';

export default class FactionSheet extends Blades68ActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['faction'],
    position: { width: 560, height: 720 }
  };

  static PARTS = {
    body: { template: 'systems/blades68/templates/actor/faction-sheet.hbs' }
  };
}
