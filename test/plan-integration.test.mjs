import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createIntegrationPlan } from '../skills/indie-payment-kit/scripts/plan-integration.mjs';

async function projectWithPackage(dependencies) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-plan-'));
  await writeFile(path.join(directory, 'package.json'), JSON.stringify({ dependencies }));
  return directory;
}

test('TanStack plan keeps the user in one workflow and targets server routes', async () => {
  const project = await projectWithPackage({ '@tanstack/react-start': '1.0.0' });
  const plan = await createIntegrationPlan({ project, provider: 'dodo', billing: 'subscription' });

  assert.equal(plan.project.integrationTarget, 'tanstack');
  assert.equal(plan.implementationMode, 'agent-guided');
  assert.equal(plan.frameworkExecutionMode, 'agent-guided');
  assert.ok(plan.plannedFiles.includes('src/routes/api/payments/dodo/checkout.ts'));
  assert.ok(plan.lifecycle.includes('sandbox verification'));
  assert.equal(plan.providerPack.userEntryPoint, false);
});

test('Next.js plan targets App Router payment routes', async () => {
  const project = await projectWithPackage({ next: '15.0.0' });
  const plan = await createIntegrationPlan({ project, provider: 'stripe', billing: 'one-time' });

  assert.equal(plan.project.integrationTarget, 'nextjs');
  assert.ok(plan.plannedFiles.includes('app/api/payments/stripe/webhook/route.ts'));
  assert.ok(plan.plannedFiles.includes('lib/payments/orders.ts'));
  assert.ok(plan.plannedFiles.includes('lib/payments/entitlements.ts'));
  assert.ok(plan.templateFiles.some((file) => file.to === 'app/api/payments/stripe/checkout/route.ts'));
  assert.equal(plan.implementationMode, 'checked-in-sandbox-template');
  assert.equal(plan.evidenceTarget, 'sandbox-payment-verified');
});

test('Next.js src/app plans write into src/app and src/lib', async () => {
  const project = await projectWithPackage({ next: '15.0.0' });
  await mkdir(path.join(project, 'src', 'app'), { recursive: true });
  const plan = await createIntegrationPlan({ project, provider: 'dodo', billing: 'subscription' });

  assert.equal(plan.project.nextAppRoot, 'src/app');
  assert.ok(plan.plannedFiles.includes('src/app/api/payments/dodo/webhook/route.ts'));
  assert.ok(plan.plannedFiles.includes('src/lib/payments/entitlements.ts'));
  assert.equal(plan.templateFiles.length, 0);
  assert.equal(plan.frameworkExecutionMode, 'agent-guided');
  assert.ok(plan.guidedSteps.some((step) => step.includes('official dodo provider pack')));
});

test('Next.js Pages Router plans do not write App Router files', async () => {
  const project = await projectWithPackage({ next: '15.0.0' });
  await mkdir(path.join(project, 'src', 'pages'), { recursive: true });
  const plan = await createIntegrationPlan({ project, provider: 'stripe', billing: 'one-time' });

  assert.equal(plan.project.nextRouter, 'pages');
  assert.ok(plan.plannedFiles.includes('src/pages/api/payments/stripe/webhook.ts'));
  assert.equal(plan.templateFiles.length, 0);
  assert.equal(plan.frameworkExecutionMode, 'agent-guided');
  assert.ok(plan.guidedSteps.some((step) => step.includes('Pages Router')));
});

test('static HTML plan refuses to pretend a browser-only project has a full lifecycle', async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-static-'));
  await writeFile(path.join(project, 'index.html'), '<button>Buy</button>');
  const plan = await createIntegrationPlan({ project, provider: 'stripe', billing: 'one-time' });

  assert.equal(plan.implementationMode, 'payment-link');
  assert.equal(plan.evidenceTarget, 'sandbox-checkout-opened');
  assert.ok(plan.blockers.some((blocker) => blocker.includes('trusted server')));
  assert.equal(plan.lifecycle.some((item) => item === 'verified webhook'), false);
  assert.deepEqual(plan.requiredEnvironmentKeys, []);
  assert.deepEqual(plan.plannedFiles, ['index.html']);
});

test('existing payment domains are extended through the official pack instead of duplicated', async () => {
  const project = await projectWithPackage({
    '@tanstack/react-start': '1.0.0',
    'drizzle-orm': '0.44.0',
    stripe: '18.0.0',
  });
  await mkdir(path.join(project, 'src', 'core', 'payment'), { recursive: true });
  await mkdir(path.join(project, 'src', 'modules', 'payment'), { recursive: true });

  const plan = await createIntegrationPlan({ project, provider: 'stripe', billing: 'credits' });
  assert.equal(plan.integrationApproach, 'extend-existing');
  assert.equal(plan.implementationSource, 'official-provider-pack');
  assert.equal(plan.frameworkExecutionMode, 'agent-guided');
  assert.deepEqual(plan.inspectionTargets, ['src/core/payment', 'src/modules/payment']);
  assert.deepEqual(plan.plannedFiles, []);
  assert.deepEqual(plan.templateFiles, []);
  assert.deepEqual(plan.packagesToInstall, []);
  assert.deepEqual(plan.requiredEnvironmentKeys, []);
  assert.ok(plan.guidedSteps.some((step) => step.includes('existing payment domain')));
  assert.equal(plan.blockers.some((blocker) => blocker.includes('No checked-in write templates')), false);
});
