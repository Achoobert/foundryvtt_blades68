/* global game */
import { requireSystemActive } from '../helpers.js';

const ROLLTABLE_PACK = 'blades68.shattered-isles-names';
const MACRO_PACK = 'blades68.shattered-isles-names-macro';
const EXPECTED_TABLE_COUNT = 22;
const EXPECTED_MACRO_COUNT = 25;

function parseConst(command, name) {
  const match = command.match(new RegExp(`const\\s+${name}\\s*=\\s*(null|"([^"]*)")`));
  if (!match) return undefined;
  return match[1] === 'null' ? null : match[2];
}

export default function register(quench) {
  quench.registerBatch(
    'blades68.shattered-isles-names',
    (context) => {
      const { describe, it, assert, before } = context;

      let tables;
      let macros;

      describe('Shattered Isles Names', function () {
        before(async function () {
          requireSystemActive();
          const tablePack = game.packs.get(ROLLTABLE_PACK);
          assert.isOk(tablePack, `${ROLLTABLE_PACK} pack should exist`);
          tables = await tablePack.getDocuments();

          const macroPack = game.packs.get(MACRO_PACK);
          assert.isOk(macroPack, `${MACRO_PACK} pack should exist`);
          macros = await macroPack.getDocuments();
        });

        it(`ships ${EXPECTED_TABLE_COUNT} fully populated 1d36 roll tables`, function () {
          assert.lengthOf(
            tables,
            EXPECTED_TABLE_COUNT,
            `expected ${EXPECTED_TABLE_COUNT} tables, got ${tables.length}: ${tables.map((t) => t.name).join(', ')}`
          );

          for (const table of tables) {
            assert.equal(table.formula, '1d36', `${table.name} should roll 1d36`);
            assert.isTrue(table.replacement, `${table.name} should draw with replacement`);
            assert.lengthOf(table.results, 36, `${table.name} should have 36 results`);

            const seenNumbers = new Set();
            for (const result of table.results) {
              assert.equal(result.type, 'text', `${table.name} result should be a text entry`);
              assert.isNotEmpty(result.text, `${table.name} result should not be blank`);
              assert.equal(result.weight, 1, `${table.name} result "${result.text}" should have weight 1`);
              const [low, high] = result.range;
              assert.equal(low, high, `${table.name} result "${result.text}" should be a single-number range`);
              assert.isFalse(seenNumbers.has(low), `${table.name} should not repeat range ${low}`);
              seenNumbers.add(low);
            }
            assert.deepEqual(
              [...seenNumbers].sort((a, b) => a - b),
              Array.from({ length: 36 }, (_, i) => i + 1),
              `${table.name} should cover ranges 1-36 with no gaps`
            );
          }
        });

        it(`ships ${EXPECTED_MACRO_COUNT} macros (24 namers + reset)`, function () {
          assert.lengthOf(
            macros,
            EXPECTED_MACRO_COUNT,
            `expected ${EXPECTED_MACRO_COUNT} macros, got ${macros.length}: ${macros.map((m) => m.name).join(', ')}`
          );
          for (const macro of macros) {
            assert.equal(macro.type, 'script', `${macro.name} should be a script macro`);
            assert.equal(macro.scope, 'global', `${macro.name} should have global scope`);
            assert.isNotEmpty(macro.command, `${macro.name} should have a command`);
          }
        });

        it('every namer macro points at tables that actually exist in the roll table pack', function () {
          const tableNames = new Set(tables.map((t) => t.name));
          const namers = macros.filter((m) => m.name !== 'Reset Token Name');
          assert.lengthOf(namers, EXPECTED_MACRO_COUNT - 1, 'expected 24 actor/token namer macros');

          for (const macro of namers) {
            const pack = parseConst(macro.command, 'PACK');
            assert.equal(pack, ROLLTABLE_PACK, `${macro.name} should target ${ROLLTABLE_PACK}`);

            const givenTable = parseConst(macro.command, 'GIVEN_TABLE');
            assert.isOk(givenTable, `${macro.name} should declare a GIVEN_TABLE`);
            assert.isTrue(
              tableNames.has(givenTable),
              `${macro.name} references GIVEN_TABLE "${givenTable}" which is missing from ${ROLLTABLE_PACK}`
            );

            const familyTable = parseConst(macro.command, 'FAMILY_TABLE');
            assert.isDefined(familyTable, `${macro.name} should declare FAMILY_TABLE (string or null)`);
            if (familyTable !== null) {
              assert.isTrue(
                tableNames.has(familyTable),
                `${macro.name} references FAMILY_TABLE "${familyTable}" which is missing from ${ROLLTABLE_PACK}`
              );
            }
          }
        });

        it('reset-token-name macro carries no roll table references', function () {
          const reset = macros.find((m) => m.name === 'Reset Token Name');
          assert.isOk(reset, 'Reset Token Name macro should exist');
          assert.notInclude(reset.command, ROLLTABLE_PACK);
          assert.include(reset.command, 'canvas.tokens.controlled');
        });
      });
    },
    { displayName: 'Shattered Isles names & macros' }
  );
}
