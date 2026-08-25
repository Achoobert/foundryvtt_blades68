import assert from 'node:assert/strict';
import test from 'node:test';

import { plainTextFromHtml } from '../../module/utils/plain-text.js';

test('plainTextFromHtml creates readable hover text from ability HTML', () => {
  assert.equal(
    plainTextFromHtml('<p>Support <strong>one</strong> ally.</p><p>Gain +1d.</p>'),
    'Support one ally. Gain +1d.'
  );
  assert.equal(plainTextFromHtml('Fish &amp; chips'), 'Fish & chips');
});
