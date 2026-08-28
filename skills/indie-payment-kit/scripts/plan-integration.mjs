#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { inspectProject } from './inspect-project.mjs';
import { loadProviderPacks, resolveProviderPack } from './provider-pack.mjs';

const providers = ['stripe', 'paypal', 'dodo', 'paddle', 'polar', 'creem', 'alipay', 'wechat-pay'];
const billingModels = ['one-time', 'subscription', 'usage', 'credits'];

const targetFiles = {
  nextjs: (provider) => [
    `app/api/payments/${provider}/checkout/route.ts`,
    `app/api/payments/${provider}/webhook/route.ts`,
    'app/payment/success/page.tsx',
    '.env.example',
  ],
  tanstack: (provider) => [
    `src/routes/api/payments/${provider}/checkout.ts`,
    `src/routes/api/payments/${provider}/webhook.ts`,
    'src/routes/payment/success.tsx',
    '.env.example',
  ],
  hono: (provider) => [
    `src/routes/payments/${provider}/checkout.ts`,
    `src/routes/payments/${provider}/webhook.ts`,
    '.env.example',
  ],
  'generic-node': (provider) => [
    `src/payments/${provider}/checkout.ts`,
    `src/payments/${provider}/webhook.ts`,
    '.env.example',
  ],
  'static-html': () => ['index.html'],
  other: (provider) => [`payments/${provider}.ts`, 'payments/webhook.ts', '.env.example'],
};

const providerEnvKeys = {
  stripe: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  dodo: ['DODO_PAYMENTS_API_KEY', 'DODO_PAYMENTS_WEBHOOK_KEY', 'DODO_PAYMENTS_RETURN_URL', 'DODO_PAYMENTS_ENVIRONMENT'],
  paypal: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'],
  paddle: ['PADDLE_API_KEY', 'PADDLE_WEBHOOK_SECRET'],
  polar: ['POLAR_ACCESS_TOKEN', 'POLAR_WEBHOOK_SECRET'],
  creem: ['CREEM_API_KEY', 'CREEM_WEBHOOK_SECRET'],
  alipay: ['ALIPAY_APP_ID', 'ALIPAY_PRIVATE_KEY', 'ALIPAY_PUBLIC_KEY'],
  'wechat-pay': ['WECHATPAY_MERCHANT_ID', 'WECHATPAY_PRIVATE_KEY', 'WECHATPAY_API_V3_KEY'],
};

export async function createIntegrationPlan({ project = '.', provider, billing = 'one-time' }) {
  if (!providers.includes(provider)) throw new Error(`Unknown provider: ${provider}`);
  if (!billingModels.includes(billing)) throw new Error(`Invalid billing model: ${billing}`);

  const inspection = await inspectProject(project);
  const pack = resolveProviderPack(await loadProviderPacks(), provider, billing);
  const target = inspection.integrationTarget;
  const staticOnly = target === 'static-html' && inspection.serverCapability === 'external-required';
  const implementationMode = staticOnly ? 'payment-link' : 'full-lifecycle';
  const files = (targetFiles[target] ?? targetFiles.other)(provider);

  return {
    schemaVersion: 1,
    project: inspection,
    provider,
    billing,
    implementationMode,
    providerPack: pack,
    plannedFiles: files,
    requiredEnvironmentKeys: staticOnly ? [] : providerEnvKeys[provider] ?? [],
    lifecycle: staticOnly
      ? ['hosted checkout or payment link', 'return page', 'explicit warning that webhook and entitlement automation require a backend']
      : ['server-side checkout', 'verified webhook', 'idempotent event claim', 'order state', 'entitlement grant and revocation', 'sandbox verification'],
    evidenceTarget: staticOnly ? 'sandbox-checkout-opened' : 'sandbox-payment-verified',
    blockers: [
      ...(staticOnly ? ['No trusted server was detected. Add a backend/serverless function for verified lifecycle automation.'] : []),
      ...pack.installAvailable ? [] : ['No universal provider-pack installer is declared; the orchestrator must use the current official docs/toolkit directly.'],
    ],
  };
}

function parseArgs(argv) {
  const result = { project: '.', billing: 'one-time', format: 'markdown' };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) throw new Error(`Unexpected argument: ${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
    result[key.slice(2)] = value;
    index += 1;
  }
  if (!result.provider) throw new Error('--provider is required');
  return result;
}

function renderMarkdown(plan) {
  return [
    '# Payment integration execution plan',
    '',
    `Provider: **${plan.provider}**`,
    `Target: **${plan.project.integrationTarget}**`,
    `Project kind: **${plan.project.projectKind}**`,
    `Server capability: **${plan.project.serverCapability}**`,
    `Implementation mode: **${plan.implementationMode}**`,
    '',
    '## Planned files',
    '',
    ...plan.plannedFiles.map((file) => `- ${file}`),
    '',
    '## Lifecycle',
    '',
    ...plan.lifecycle.map((item) => `- ${item}`),
    '',
    '## Environment keys still required',
    '',
    ...plan.requiredEnvironmentKeys.map((key) => `- ${key}`),
    '',
    `Evidence target: **${plan.evidenceTarget}**`,
    ...(plan.blockers.length ? ['', '## Current blockers', '', ...plan.blockers.map((item) => `- ${item}`)] : []),
    '',
  ].join('\n');
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const plan = await createIntegrationPlan(args);
    process.stdout.write(args.format === 'json' ? `${JSON.stringify(plan, null, 2)}\n` : renderMarkdown(plan));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
