import Blades68ActorSheet from './base-actor-sheet.js';

export default class NpcSheet extends Blades68ActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['npc'],
    position: { width: 560, height: 600 }
  };

  static PARTS = {
    body: { template: 'systems/blades68/templates/actor/npc-sheet.hbs' }
  };
}
