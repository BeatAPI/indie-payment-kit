import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
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
  assert.equal(result.projectKind, 'fullstack');
  assert.equal(result.serverCapability, 'integrated');
  assert.equal(result.integrationTarget, 'tanstack');
  assert.deepEqual(result.paymentDependencies, ['stripe']);
  assert.deepEqual(result.safeEnvironmentKeys, ['STRIPE_SECRET_KEY', 'PAYMENT_PROVIDER']);
  assert.equal('secrets' in result, false);
});

test('inspector distinguishes static HTML from a trusted server', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-html-'));
  await writeFile(path.join(directory, 'index.html'), '<button>Buy</button>');

  const result = await inspectProject(directory);
  assert.equal(result.projectKind, 'static-web');
  assert.equal(result.serverCapability, 'external-required');
  assert.equal(result.integrationTarget, 'static-html');
  assert.equal(result.hasHtml, true);
  assert.ok(result.warnings.some((warning) => warning.includes('trusted backend')));
});

test('inspector detects Next.js src/app', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-src-app-'));
  await writeFile(path.join(directory, 'package.json'), JSON.stringify({ dependencies: { next: '15.0.0' } }));
  await mkdir(path.join(directory, 'src', 'app'), { recursive: true });

  const result = await inspectProject(directory);
  assert.equal(result.integrationTarget, 'nextjs');
  assert.equal(result.nextRouter, 'app');
  assert.equal(result.nextAppRoot, 'src/app');
});

test('inspector detects Next.js Pages Router', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-pages-'));
  await writeFile(path.join(directory, 'package.json'), JSON.stringify({ dependencies: { next: '15.0.0' } }));
  await mkdir(path.join(directory, 'src', 'pages'), { recursive: true });
  await writeFile(path.join(directory, 'src', 'pages', 'index.js'), 'export default function Home() { return null }');

  const result = await inspectProject(directory);
  assert.equal(result.nextRouter, 'pages');
  assert.equal(result.nextAppRoot, null);
  assert.equal(result.nextPagesRoot, 'src/pages');
});

test('inspector recognizes HTML backed by Express', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-express-'));
  await writeFile(path.join(directory, 'index.html'), '<button>Buy</button>');
  await writeFile(path.join(directory, 'package.json'), JSON.stringify({ dependencies: { express: '5.0.0' } }));

  const result = await inspectProject(directory);
  assert.equal(result.projectKind, 'html-with-backend');
  assert.equal(result.serverCapability, 'backend');
  assert.equal(result.integrationTarget, 'generic-node');
});

test('inspector finds an existing payment domain and data layer before planning writes', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-existing-'));
  await writeFile(
    path.join(directory, 'package.json'),
    JSON.stringify({
      dependencies: {
        '@tanstack/react-start': '1.0.0',
        'drizzle-orm': '0.44.0',
        stripe: '18.0.0',
      },
    }),
  );
  for (const filename of [
    'src/core/payment/index.ts',
    'src/modules/payment/service.ts',
    'src/routes/api/payment/checkout.ts',
  ]) {
    const file = path.join(directory, filename);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, 'export {};\n');
  }

  const result = await inspectProject(directory);
  assert.deepEqual(result.existingPaymentPaths, [
    'src/core/payment',
    'src/modules/payment',
    'src/routes/api/payment',
  ]);
  assert.deepEqual(result.dataLayers, ['drizzle']);
});
