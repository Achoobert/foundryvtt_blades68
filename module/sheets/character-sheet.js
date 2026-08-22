import Blades68ActorSheet from './base-actor-sheet.js';
import { BLADES68 } from '../config.js';

export default class CharacterSheet extends Blades68ActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['character']
  };

  static PARTS = {
    body: { template: 'systems/blades68/templates/actor/character-sheet.hbs' }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.actor.system;

    context.harmTiers = BLADES68.HARM_TIERS.map((tier) => ({
      key: tier.key,
      labelKey: `BLADES68.HarmTier.${tier.key}`,
      slots: Array.from({ length: tier.slots }, (_unused, i) => {
        const slotKey = `slot${i + 1}`;
        return { slotKey, value: system.harm[tier.key][slotKey] };
      })
    }));

    context.keyDeadlockPairs = system.keys.map((key, index) => ({
      index,
      key,
      deadlock: system.deadlocks[index]
    }));

    const gearItems = this.actor.items.filter((item) => item.type === 'gear');
    const carriedLoad = gearItems
      .filter((item) => item.system.carried)
      .reduce((sum, item) => sum + (item.system.load ?? 0), 0);
    const { quietMax, loudMin } = system.load;
    const loadTier = carriedLoad <= quietMax ? 'quiet' : carriedLoad >= loudMin ? 'loud' : 'normal';

    context.gearItems = gearItems;
    context.loadSummary = { total: carriedLoad, tier: loadTier, quietMax, loudMin };
    context.playbookItem = this.actor.items.find((item) => item.type === 'playbook');
    context.heritageItem = this.actor.items.find((item) => item.type === 'heritage');
    context.viceItem = this.actor.items.find((item) => item.type === 'vice');

    return context;
  }
}
