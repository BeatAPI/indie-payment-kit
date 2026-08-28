import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { inspectProject } from '../skills/indie-payment-kit/scripts/inspect-project.mjs';

test('inspector detects framework and payment dependencies without reading secrets', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-'));
  await writeFile(
    path.join(directory, 'package.json'),
    JSON.stringify({
      dependencies: {
        '@tanstack/react-start': '1.0.0',
        stripe: '18.0.0',
      },
    })
  );
  await writeFile(
    path.join(directory, '.env.example'),
    'STRIPE_SECRET_KEY=\nDATABASE_URL=\nPAYMENT_PROVIDER=stripe\n'
  );
  await writeFile(path.join(directory, 'package-lock.json'), '{}');

  const result = await inspectProject(directory);
  assert.equal(result.suggestedStack, 'tanstack');
  assert.deepEqual(result.paymentDependencies, ['stripe']);
  assert.deepEqual(result.safeEnvironmentKeys, ['STRIPE_SECRET_KEY', 'PAYMENT_PROVIDER']);
  assert.equal('secrets' in result, false);
});
