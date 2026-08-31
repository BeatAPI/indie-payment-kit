import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { materializeIntegration } from '../skills/indie-payment-kit/scripts/materialize-integration.mjs';

test('materialize writes Next.js Stripe domain and route files', async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-write-'));
  await writeFile(path.join(project, 'package.json'), JSON.stringify({ dependencies: { next: '15.0.0' } }));
  await mkdir(path.join(project, 'app'), { recursive: true });

  const result = await materializeIntegration({ project, provider: 'stripe', billing: 'one-time' });
  assert.equal(result.reason, 'written');
  assert.ok(result.written.includes('lib/payments/orders.ts'));
  assert.ok(result.written.includes('app/api/payments/stripe/webhook/route.ts'));
  const webhook = await readFile(path.join(project, 'app/api/payments/stripe/webhook/route.ts'), 'utf8');
  assert.match(webhook, /constructEvent/);
  assert.match(webhook, /beginEvent/);
  assert.match(webhook, /completeEvent/);
  assert.match(webhook, /failEvent/);
  assert.doesNotMatch(webhook, /claimEvent/);
  assert.match(webhook, /session\.payment_intent/);
  assert.match(webhook, /attachProviderRef/);
  const events = await readFile(path.join(project, 'lib/payments/events.ts'), 'utf8');
  assert.match(events, /'processing' \| 'succeeded' \| 'failed'/);
  assert.match(events, /receipt\?\.status === 'succeeded'/);
  assert.doesNotMatch(events, /status === 'processing'\) return false/);
  const store = await readFile(path.join(project, 'lib/payments/store.ts'), 'utf8');
  assert.match(store, /sandbox scaffold/i);
  assert.match(store, /ENOENT/);
  const checkout = await readFile(path.join(project, 'app/api/payments/stripe/checkout/route.ts'), 'utf8');
  assert.match(checkout, /const mode = 'payment'/);
  assert.doesNotMatch(checkout, /body\.priceId/);
  assert.match(checkout, /process\.env\.STRIPE_PRICE_ID/);
  assert.match(checkout, /INDIE_PAYMENT_KIT_ENABLE_SANDBOX_CHECKOUT/);
  assert.match(checkout, /NODE_ENV === 'production'/);
  assert.ok(checkout.indexOf('INDIE_PAYMENT_KIT_ENABLE_SANDBOX_CHECKOUT') < checkout.indexOf('await createOrder'));
  const gitignore = await readFile(path.join(project, '.gitignore'), 'utf8');
  assert.match(gitignore, /\.indie-payment-kit\/state\.json/);
  const env = await readFile(path.join(project, '.env.example'), 'utf8');
  assert.match(env, /STRIPE_WEBHOOK_SECRET=/);
  assert.match(env, /INDIE_PAYMENT_KIT_ENABLE_SANDBOX_CHECKOUT=/);
});

test('materialize keeps Dodo product selection on the trusted server', async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-dodo-write-'));
  await writeFile(path.join(project, 'package.json'), JSON.stringify({ dependencies: { next: '15.0.0' } }));
  await mkdir(path.join(project, 'app'), { recursive: true });

  await materializeIntegration({ project, provider: 'dodo', billing: 'one-time' });
  const checkout = await readFile(path.join(project, 'app/api/payments/dodo/checkout/route.ts'), 'utf8');
  assert.doesNotMatch(checkout, /request\.json/);
  assert.match(checkout, /process\.env\.DODO_PAYMENTS_PRODUCT_ID/);
  assert.match(checkout, /INDIE_PAYMENT_KIT_ENABLE_SANDBOX_CHECKOUT/);
  assert.match(checkout, /NODE_ENV === 'production'/);
  assert.ok(checkout.indexOf('INDIE_PAYMENT_KIT_ENABLE_SANDBOX_CHECKOUT') < checkout.indexOf('await createOrder'));
  const webhook = await readFile(path.join(project, 'app/api/payments/dodo/webhook/route.ts'), 'utf8');
  assert.match(webhook, /refund\.succeeded/);
  assert.doesNotMatch(webhook, /payment\.refunded/);
});

test('materialize refuses to overlay an existing payment directory', async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-skip-'));
  await writeFile(path.join(project, 'package.json'), JSON.stringify({ dependencies: { next: '15.0.0' } }));
  await mkdir(path.join(project, 'lib', 'payments'), { recursive: true });
  await writeFile(path.join(project, 'lib/payments/orders.ts'), 'export const existing = true;\n');

  const first = await materializeIntegration({ project, provider: 'stripe', billing: 'one-time' });
  assert.equal(first.reason, 'extend-existing');
  assert.deepEqual(first.written, []);
  const kept = await readFile(path.join(project, 'lib/payments/orders.ts'), 'utf8');
  assert.match(kept, /existing/);
});

test('materialize leaves mature payment domains untouched for agent-guided extension', async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-existing-write-'));
  await writeFile(
    path.join(project, 'package.json'),
    JSON.stringify({ dependencies: { '@tanstack/react-start': '1.0.0', stripe: '18.0.0' } }),
  );
  await mkdir(path.join(project, 'src', 'core', 'payment'), { recursive: true });
  await writeFile(path.join(project, 'src', 'core', 'payment', 'index.ts'), 'export const existing = true;\n');

  const result = await materializeIntegration({ project, provider: 'stripe', billing: 'credits' });
  assert.equal(result.reason, 'extend-existing');
  assert.deepEqual(result.written, []);
  assert.equal(result.envUpdated, false);
  assert.equal(result.gitignoreUpdated, false);
});

test('materialize rejects symlinked destinations instead of writing outside the project', async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-write-link-'));
  const outside = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-write-link-outside-'));
  await writeFile(path.join(project, 'package.json'), JSON.stringify({ dependencies: { next: '15.0.0' } }));
  await mkdir(path.join(project, 'app'), { recursive: true });
  await symlink(outside, path.join(project, 'lib'));

  await assert.rejects(
    () => materializeIntegration({ project, provider: 'stripe', billing: 'one-time' }),
    /symbolic link/,
  );
  await assert.rejects(() => access(path.join(outside, 'payments', 'store.ts')));
});

test('materialize rejects broad filesystem targets before inspection or writes', async () => {
  await assert.rejects(
    () => materializeIntegration({ project: '/', provider: 'stripe', billing: 'one-time' }),
    /broad system or home directory/,
  );
});
