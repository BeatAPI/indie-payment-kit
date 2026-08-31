#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { inspectProject } from './inspect-project.mjs';
import { loadProviderPacks, resolveProviderPack } from './provider-pack.mjs';

const providers = ['stripe', 'paypal', 'dodo', 'paddle', 'polar', 'creem', 'alipay', 'wechat-pay'];
const billingModels = ['one-time', 'subscription', 'usage', 'credits'];
const templatedProviders = new Set(['stripe', 'dodo']);

const providerEnvKeys = {
  stripe: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_ID', 'APP_URL', 'INDIE_PAYMENT_KIT_ENABLE_SANDBOX_CHECKOUT'],
  dodo: ['DODO_PAYMENTS_API_KEY', 'DODO_PAYMENTS_WEBHOOK_KEY', 'DODO_PAYMENTS_PRODUCT_ID', 'DODO_PAYMENTS_RETURN_URL', 'DODO_PAYMENTS_ENVIRONMENT', 'APP_URL', 'INDIE_PAYMENT_KIT_ENABLE_SANDBOX_CHECKOUT'],
  paypal: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID', 'APP_URL'],
  paddle: ['PADDLE_API_KEY', 'PADDLE_WEBHOOK_SECRET', 'APP_URL'],
  polar: ['POLAR_ACCESS_TOKEN', 'POLAR_WEBHOOK_SECRET', 'APP_URL'],
  creem: ['CREEM_API_KEY', 'CREEM_WEBHOOK_SECRET', 'APP_URL'],
  alipay: ['ALIPAY_APP_ID', 'ALIPAY_PRIVATE_KEY', 'ALIPAY_PUBLIC_KEY', 'APP_URL'],
  'wechat-pay': ['WECHATPAY_MERCHANT_ID', 'WECHATPAY_PRIVATE_KEY', 'WECHATPAY_API_V3_KEY', 'APP_URL'],
};

const providerPackages = {
  stripe: ['stripe'],
  dodo: ['dodopayments', 'standardwebhooks'],
  paypal: ['@paypal/paypal-server-sdk'],
};

function paymentLibRoot(inspection) {
  if (inspection.integrationTarget === 'nextjs' && inspection.nextAppRoot === 'src/app') return 'src/lib/payments';
  if (inspection.integrationTarget === 'nextjs') return 'lib/payments';
  if (inspection.integrationTarget === 'tanstack') return 'src/lib/payments';
  if (inspection.integrationTarget === 'hono' || inspection.integrationTarget === 'generic-node') return 'src/payments';
  return 'payments';
}

function plannedFilesFor(inspection, provider) {
  const libRoot = paymentLibRoot(inspection);
  const domain = [
    `${libRoot}/store.ts`,
    `${libRoot}/orders.ts`,
    `${libRoot}/events.ts`,
    `${libRoot}/entitlements.ts`,
  ];

  if (inspection.integrationTarget === 'nextjs' && inspection.nextRouter === 'pages') {
    const pagesRoot = inspection.nextPagesRoot ?? 'pages';
    return [
      ...domain,
      `${pagesRoot}/api/payments/${provider}/checkout.ts`,
      `${pagesRoot}/api/payments/${provider}/webhook.ts`,
      '.env.example',
    ];
  }

  if (inspection.integrationTarget === 'nextjs') {
    const appRoot = inspection.nextAppRoot ?? 'app';
    return [
      ...domain,
      `${appRoot}/api/payments/${provider}/checkout/route.ts`,
      `${appRoot}/api/payments/${provider}/webhook/route.ts`,
      `${appRoot}/payment/success/page.tsx`,
      '.env.example',
    ];
  }

  if (inspection.integrationTarget === 'tanstack') {
    return [
      ...domain,
      `src/routes/api/payments/${provider}/checkout.ts`,
      `src/routes/api/payments/${provider}/webhook.ts`,
      'src/routes/payment/success.tsx',
      '.env.example',
    ];
  }

  if (inspection.integrationTarget === 'hono' || inspection.integrationTarget === 'generic-node') {
    return [
      ...domain,
      `src/payments/${provider}/checkout.ts`,
      `src/payments/${provider}/webhook.ts`,
      '.env.example',
    ];
  }

  if (inspection.integrationTarget === 'static-html') return ['index.html'];
  return [...domain, `payments/${provider}.ts`, 'payments/webhook.ts', '.env.example'];
}

function templateFilesFor(inspection, provider, billing) {
  if (inspection.integrationTarget !== 'nextjs' || inspection.nextRouter === 'pages') return [];
  if (!templatedProviders.has(provider)) return [];
  if (billing !== 'one-time') return [];

  const libRoot = paymentLibRoot(inspection);
  const appRoot = inspection.nextAppRoot ?? 'app';
  return [
    { from: 'templates/nextjs/lib/payments/store.ts', to: `${libRoot}/store.ts` },
    { from: 'templates/nextjs/lib/payments/orders.ts', to: `${libRoot}/orders.ts` },
    { from: 'templates/nextjs/lib/payments/events.ts', to: `${libRoot}/events.ts` },
    { from: 'templates/nextjs/lib/payments/entitlements.ts', to: `${libRoot}/entitlements.ts` },
    { from: `templates/nextjs/${provider}/checkout.route.ts`, to: `${appRoot}/api/payments/${provider}/checkout/route.ts` },
    { from: `templates/nextjs/${provider}/webhook.route.ts`, to: `${appRoot}/api/payments/${provider}/webhook/route.ts` },
    { from: 'templates/nextjs/success.page.tsx', to: `${appRoot}/payment/success/page.tsx` },
  ];
}

export async function createIntegrationPlan({ project = '.', provider, billing = 'one-time' }) {
  if (!providers.includes(provider)) throw new Error(`Unknown provider: ${provider}`);
  if (!billingModels.includes(billing)) throw new Error(`Invalid billing model: ${billing}`);

  const inspection = await inspectProject(project);
  const pack = resolveProviderPack(await loadProviderPacks(), provider, billing);
  const target = inspection.integrationTarget;
  const staticOnly = target === 'static-html' && inspection.serverCapability === 'external-required';
  const hasExistingPaymentDomain = inspection.existingPaymentPaths.length > 0;
  const integrationApproach = staticOnly
    ? 'payment-link'
    : hasExistingPaymentDomain
      ? 'extend-existing'
      : 'new-integration';
  const files = hasExistingPaymentDomain ? [] : plannedFilesFor(inspection, provider);
  const templateFiles = staticOnly || hasExistingPaymentDomain ? [] : templateFilesFor(inspection, provider, billing);
  const hasWriteTemplates = templateFiles.length > 0;
  const implementationMode = staticOnly
    ? 'payment-link'
    : hasWriteTemplates
      ? 'checked-in-sandbox-template'
      : 'agent-guided';
  const frameworkExecutionMode = implementationMode;
  const packageAlreadyPresent = inspection.paymentDependencies.includes(provider);

  return {
    schemaVersion: 2,
    project: inspection,
    provider,
    billing,
    integrationApproach,
    implementationMode,
    implementationSource: 'official-provider-pack',
    frameworkExecutionMode,
    providerPack: pack,
    inspectionTargets: inspection.existingPaymentPaths,
    detectedEnvironmentKeys: inspection.safeEnvironmentKeys,
    plannedFiles: files,
    templateFiles,
    packagesToInstall: staticOnly || packageAlreadyPresent ? [] : providerPackages[provider] ?? [],
    requiredEnvironmentKeys: staticOnly || hasExistingPaymentDomain ? [] : providerEnvKeys[provider] ?? [],
    lifecycle: staticOnly
      ? ['hosted checkout or payment link', 'return page', 'explicit warning that webhook and entitlement automation require a backend']
      : ['server-side checkout', 'verified webhook', 'idempotent event claim', 'order state', 'entitlement grant and revocation', 'sandbox verification'],
    evidenceTarget: staticOnly ? 'sandbox-checkout-opened' : 'sandbox-payment-verified',
    guidedSteps: [
      `Load only the selected official ${provider} provider pack and follow its current API instructions.`,
      ...(hasExistingPaymentDomain
        ? [`Inspect and extend the existing payment domain at: ${inspection.existingPaymentPaths.join(', ')}.`]
        : []),
      ...(hasExistingPaymentDomain && inspection.safeEnvironmentKeys.length
        ? [`Preserve the project's existing payment configuration keys: ${inspection.safeEnvironmentKeys.join(', ')}.`]
        : []),
      ...(!staticOnly && !hasWriteTemplates
        ? [`Implement the ${target} adapter in the project's native routing, auth, data, and test conventions.`]
        : []),
      ...(inspection.nextRouter === 'pages'
        ? ['Adapt the official provider instructions to the detected Pages Router paths; do not write App Router files.']
        : []),
      ...(!pack.installAvailable
        ? ['Read the provider-maintained Skill or official documentation directly inside this workflow.']
        : []),
    ],
    blockers: [
      ...(staticOnly ? ['No trusted server was detected. Add a backend/serverless function for verified lifecycle automation.'] : []),
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
    `Integration approach: **${plan.integrationApproach}**`,
    `Framework execution: **${plan.frameworkExecutionMode}**`,
    '',
    ...(plan.inspectionTargets.length
      ? ['## Existing payment domain', '', ...plan.inspectionTargets.map((file) => `- ${file}`), '']
      : []),
    '## Planned files',
    '',
    ...plan.plannedFiles.map((file) => `- ${file}`),
    '',
    ...(plan.templateFiles.length
      ? ['## Write templates', '', ...plan.templateFiles.map((file) => `- ${file.from} -> ${file.to}`), '']
      : []),
    '## Lifecycle',
    '',
    ...plan.lifecycle.map((item) => `- ${item}`),
    '',
    '## Environment keys still required',
    '',
    ...plan.requiredEnvironmentKeys.map((key) => `- ${key}`),
    '',
    '## Guided implementation steps',
    '',
    ...plan.guidedSteps.map((step) => `- ${step}`),
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
