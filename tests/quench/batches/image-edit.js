
import { createdDocsTracker, requireSystemActive } from '../helpers.js';

function stubFilePickerRender() {
  const FP = foundry.applications.apps.FilePicker.implementation ?? foundry.applications.apps.FilePicker;
  const original = FP.prototype.render;
  const calls = [];
  FP.prototype.render = function (...args) {
    calls.push({ instance: this, args });
    return this;
  };
  return {
    calls,
    restore() {
      FP.prototype.render = original;
    }
  };
}

export default function register(quench) {
  quench.registerBatch(
    'blades68.image-edit',
    (context) => {
      const { describe, it, assert, after } = context;
      const tracker = createdDocsTracker();

      after(async () => {
        await tracker.cleanup();
      });

      describe('portrait click opens the image FilePicker', function () {
        it('character actor sheet: clicking the portrait triggers editImage', async function () {
          this.timeout(10000);
          requireSystemActive();
          const actor = tracker.track(await Actor.create({ name: 'Quench Img PC', type: 'character' }));
          const sheet = actor.sheet;

          await sheet.render(true);
          const spy = stubFilePickerRender();
          try {
            const img = sheet.element.querySelector('img[data-edit="img"]');
            assert.exists(img, 'portrait img should exist');
            assert.equal(img.dataset.action, 'editImage', 'portrait img should have data-action="editImage"');

            img.click();
            await new Promise((resolve) => setTimeout(resolve, 100));

            assert.isAbove(spy.calls.length, 0, 'FilePicker.render should have been invoked');
          } finally {
            spy.restore();
            await sheet.close();
          }
        });

        it('item sheet (ability): clicking the portrait triggers editImage', async function () {
          this.timeout(10000);
          requireSystemActive();
          const item = tracker.track(await Item.create({ name: 'Quench Img Ability', type: 'ability' }));
          const sheet = item.sheet;

          await sheet.render(true);
          const spy = stubFilePickerRender();
          try {
            const img = sheet.element.querySelector('img[data-edit="img"]');
            assert.exists(img, 'portrait img should exist');
            assert.equal(img.dataset.action, 'editImage', 'portrait img should have data-action="editImage"');

            img.click();
            await new Promise((resolve) => setTimeout(resolve, 100));

            assert.isAbove(spy.calls.length, 0, 'FilePicker.render should have been invoked');
          } finally {
            spy.restore();
            await sheet.close();
          }
        });
      });
    },
    { displayName: 'Image edit (FilePicker) click wiring' }
  );
}
