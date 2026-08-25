import Blades68ActorSheet from './base-actor-sheet.js';
import { BLADES68 } from '../config.js';

export default class CharacterSheet extends Blades68ActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['character'],
    actions: {
      toggleAbility: this._onToggleAbility,
      setContactRelationship: this._onSetContactRelationship
    }
  };

  static async _onToggleAbility(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    await item.update({ 'system.unlocked': !item.system.unlocked });
  }

  static async _onSetContactRelationship(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const next = target.dataset.relationship ?? '';
    const value = item.system.relationship === next ? '' : next;
    await item.update({ 'system.relationship': value });
  }

  static PARTS = {
    body: { template: 'systems/blades68/templates/actor/character-sheet.hbs' }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.actor.system;

    context.harmTiers = [...BLADES68.HARM_TIERS].reverse().map((tier, index, list) => ({
      key: tier.key,
      level: list.length - index,
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

    context.playbookGear = gearItems.filter((item) => item.system.playbook);
    context.commonGear = gearItems.filter((item) => !item.system.playbook);
    context.loadSummary = { total: carriedLoad, tier: loadTier, quietMax, loudMin };
    context.playbookItem = this.actor.items.find((item) => item.type === 'playbook');
    context.heritageItem = this.actor.items.find((item) => item.type === 'heritage');
    context.viceItem = this.actor.items.find((item) => item.type === 'vice');
    context.abilityItems = this.actor.items.filter((item) => item.type === 'ability');
    context.contactItems = this.actor.items.filter((item) => item.type === 'contact');

    return context;
  }
}
