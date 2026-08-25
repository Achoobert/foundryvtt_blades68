import registerActorBatches from './batches/actors.js';
import registerItemBatches from './batches/items.js';
import registerDiceBatches from './batches/dice.js';
import registerClockBatches from './batches/clocks.js';
import registerSheetBatches from './batches/sheets.js';
import registerPdfImportBatches from './batches/pdf-import.js';

const REGISTRARS = [
  ['actors', registerActorBatches],
  ['items', registerItemBatches],
  ['dice', registerDiceBatches],
  ['clocks', registerClockBatches],
  ['sheets', registerSheetBatches],
  ['pdf-import', registerPdfImportBatches]
];

window.__blades68QuenchModuleLoaded = true;

Hooks.on('quenchReady', (quench) => {
  window.__blades68QuenchReadyFired = true;
  window.__blades68QuenchRegistered = [];
  for (const [name, register] of REGISTRARS) {
    try {
      register(quench);
      window.__blades68QuenchRegistered.push(name);
    } catch (err) {
      console.error(`[blades68-quench-tests] failed to register "${name}" batch:`, err);
      window.__blades68QuenchRegisterError = { name, message: err.message, stack: err.stack };
    }
  }
});
