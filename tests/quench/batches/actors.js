export default function registerActorBatches(quench) {
  quench.registerBatch('blades68.actors', (context) => {
    const { describe, it, assert, after } = context;
    const created = [];

    after(async () => {
      for (const actor of created) await actor.delete();
    });

    describe('Actor data models', () => {
      it('creates a character with default attributes and stress', async () => {
        const actor = await Actor.create({ name: 'Quench PC', type: 'character' });
        created.push(actor);
        assert.equal(actor.system.attributes.insight.actions.hunt, 0);
        assert.equal(actor.system.attributes.prowess.actions.wreck, 0);
        assert.equal(actor.system.stress.value, 0);
        assert.equal(actor.system.stress.max, 9);
        assert.lengthOf(actor.system.keys, 5);
        assert.lengthOf(actor.system.deadlocks, 5);
        assert.equal(actor.system.keys[0].marks, 0);
        assert.equal(actor.system.harm.passing.slot1, '');
        assert.equal(actor.system.harm.mortal.slot1, '');
      });

      it('creates an npc with a default action rating', async () => {
        const actor = await Actor.create({ name: 'Quench NPC', type: 'npc' });
        created.push(actor);
        assert.equal(actor.system.actionRating, 0);
        assert.isArray(actor.system.harm);
        assert.isArray(actor.system.tags);
      });

      it('creates a crew with default tier and hold', async () => {
        const actor = await Actor.create({ name: 'Quench Crew', type: 'crew' });
        created.push(actor);
        assert.equal(actor.system.tier, 0);
        assert.equal(actor.system.hold, 'weak');
        assert.equal(actor.system.wanted.max, 4);
        assert.equal(actor.system.vault.max, 16);
        assert.equal(actor.system.turf.max, 6);
        assert.lengthOf(actor.system.xpClocks, 4);
      });

      it('creates a faction with default category and status', async () => {
        const actor = await Actor.create({ name: 'Quench Faction', type: 'faction' });
        created.push(actor);
        assert.equal(actor.system.category, 'underworld');
        assert.equal(actor.system.status, 0);
        assert.isFalse(actor.system.war);
      });

      it('updates a character attribute rating via document update', async () => {
        const actor = await Actor.create({ name: 'Quench PC Rating', type: 'character' });
        created.push(actor);
        await actor.update({ 'system.attributes.prowess.actions.skirmish': 3 });
        assert.equal(actor.system.attributes.prowess.actions.skirmish, 3);
      });
    });
  });
}
