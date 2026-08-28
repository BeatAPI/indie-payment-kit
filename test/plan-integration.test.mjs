import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
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
  assert.equal(plan.implementationMode, 'full-lifecycle');
  assert.ok(plan.plannedFiles.includes('src/routes/api/payments/dodo/checkout.ts'));
  assert.ok(plan.lifecycle.includes('sandbox verification'));
  assert.equal(plan.providerPack.userEntryPoint, false);
});

test('Next.js plan targets App Router payment routes', async () => {
  const project = await projectWithPackage({ next: '15.0.0' });
  const plan = await createIntegrationPlan({ project, provider: 'stripe', billing: 'one-time' });

  assert.equal(plan.project.integrationTarget, 'nextjs');
  assert.ok(plan.plannedFiles.includes('app/api/payments/stripe/webhook/route.ts'));
  assert.equal(plan.evidenceTarget, 'sandbox-payment-verified');
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
