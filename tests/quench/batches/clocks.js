export default function registerClockBatches(quench) {
  quench.registerBatch('blades68.clocks', (context) => {
    const { describe, it, assert } = context;

    describe('clock Handlebars helpers', () => {
      it('dotsFor returns the right number of dots, filled up to value', () => {
        const dots = Handlebars.helpers.dotsFor(2, 4);
        assert.lengthOf(dots, 4);
        assert.deepEqual(
          dots.map((d) => d.filled),
          [true, true, false, false]
        );
      });

      it('clockSegments returns one wedge per max, filled up to value', () => {
        const segments = Handlebars.helpers.clockSegments(3, 6);
        assert.lengthOf(segments, 6);
        assert.equal(segments.filter((s) => s.filled).length, 3);
      });

      it('clockSegments handles a single-segment (max=1) clock as a full circle', () => {
        const segments = Handlebars.helpers.clockSegments(0, 1);
        assert.lengthOf(segments, 1);
        assert.isTrue(segments[0].fullCircle);
      });
    });

    describe('Clock Tracker aggregation', () => {
      it('only surfaces clocks flagged as shared', async () => {
        const actor = await Actor.create({ name: 'Quench Clock Tracker Host', type: 'crew' });
        try {
          await actor.createEmbeddedDocuments('Item', [
            { name: 'Hidden Clock', type: 'clock', system: { shared: false } },
            { name: 'Shared Clock', type: 'clock', system: { shared: true } }
          ]);

          const sharedClocks = game.actors.contents
            .flatMap((a) => a.items.filter((i) => i.type === 'clock' && i.system.shared))
            .filter((i) => i.parent.id === actor.id);

          assert.lengthOf(sharedClocks, 1);
          assert.equal(sharedClocks[0].name, 'Shared Clock');
        } finally {
          await actor.delete();
        }
      });
    });
  });
}
