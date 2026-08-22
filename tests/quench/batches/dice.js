import { classifyResultTier, rollDicePool } from '/systems/blades68/module/dice/roll-engine.js';

export default function registerDiceBatches(quench) {
  quench.registerBatch('blades68.dice', (context) => {
    const { describe, it, assert } = context;

    describe('classifyResultTier', () => {
      it('two sixes is a critical', () => {
        assert.equal(classifyResultTier([6, 6]), 'critical');
      });

      it('one six among others is a success', () => {
        assert.equal(classifyResultTier([6, 3, 2]), 'success');
      });

      it('a 4 or 5 highest is a partial success', () => {
        assert.equal(classifyResultTier([4, 2]), 'partial');
        assert.equal(classifyResultTier([5, 1]), 'partial');
      });

      it('1-3 highest is a failure', () => {
        assert.equal(classifyResultTier([3, 2, 1]), 'failure');
      });

      it('an empty pool is a failure', () => {
        assert.equal(classifyResultTier([]), 'failure');
      });
    });

    describe('rollDicePool', () => {
      it('rolls N dice for a positive pool size', async () => {
        const result = await rollDicePool(3);
        assert.isFalse(result.zeroDice);
        assert.lengthOf(result.dice, 3);
      });

      it('rolls 2d6 keep-lowest for a zero pool', async () => {
        const result = await rollDicePool(0);
        assert.isTrue(result.zeroDice);
        assert.lengthOf(result.dice, 1);
      });

      it('never returns a critical on a zero pool', async () => {
        for (let i = 0; i < 10; i++) {
          const result = await rollDicePool(0);
          assert.notEqual(result.tier, 'critical');
        }
      });
    });
  });
}
