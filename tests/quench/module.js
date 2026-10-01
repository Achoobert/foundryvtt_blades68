/* global Hooks */
import registerSystem from './batches/system.js';
import registerDice from './batches/dice.js';
import registerActors from './batches/actors.js';
import registerActorSheetCatalogs from './batches/actor-sheet-catalogs.js';
import registerCrewTypes from './batches/crew-types.js';
import registerPrison from './batches/prison.js';
import registerChatCards from './batches/chat-cards.js';
import registerShatteredIslesNames from './batches/shattered-isles-names.js';
import registerImageEdit from './batches/image-edit.js';

const BATCH_REGISTRARS = [
  registerSystem,
  registerDice,
  registerActors,
  registerActorSheetCatalogs,
  registerCrewTypes,
  registerPrison,
  registerChatCards,
  registerShatteredIslesNames,
  registerImageEdit
];

Hooks.on('quenchReady', (quench) => {
  for (const register of BATCH_REGISTRARS) register(quench);
});
