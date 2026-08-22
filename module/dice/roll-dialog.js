import { BLADES68 } from '../config.js';

const { DialogV2 } = foundry.applications.api;

export async function promptActionRoll({ title, rating, defaultPosition = 'risky', defaultEffect = 'standard' }) {
  const content = await foundry.applications.handlebars.renderTemplate(
    'systems/blades68/templates/apps/roll-prompt.hbs',
    {
      rating,
      positions: BLADES68.POSITIONS,
      effects: BLADES68.EFFECTS,
      defaultPosition,
      defaultEffect
    }
  );

  const result = await DialogV2.wait({
    window: { title },
    content,
    rejectClose: false,
    buttons: [
      { action: 'cancel', label: game.i18n.localize('BLADES68.Dialog.Cancel') },
      {
        action: 'roll',
        label: game.i18n.localize('BLADES68.Dialog.Roll'),
        default: true,
        callback: (event, button) => ({
          position: button.form.elements.position.value,
          effect: button.form.elements.effect.value,
          modifier: Number(button.form.elements.modifier.value || 0)
        })
      }
    ],
    render: (event, dialog) => {
      const root = dialog.element;
      const modifierInput = root.querySelector('[name="modifier"]');
      const totalDisplay = root.querySelector('.total-dice-value');
      const updateTotal = () => {
        const modifier = Number(modifierInput.value || 0);
        totalDisplay.textContent = Math.max(0, rating + modifier);
      };
      modifierInput.addEventListener('input', updateTotal);
      modifierInput.addEventListener('change', updateTotal);
    }
  });

  return result && typeof result === 'object' ? result : null;
}

export async function promptDicePoolSize(defaultValue = 1) {
  const content = `<div class="form-group">
    <label>${game.i18n.localize('BLADES68.Dialog.PoolSize')}</label>
    <input type="number" name="poolSize" value="${defaultValue}" min="0" max="10" />
  </div>`;

  return DialogV2.prompt({
    window: { title: game.i18n.localize('BLADES68.Dialog.RollTitle') },
    content,
    ok: {
      label: game.i18n.localize('BLADES68.Dialog.Roll'),
      callback: (event, button) => Number(button.form.elements.poolSize.value || 0)
    }
  });
}
