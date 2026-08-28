#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const frameworkPackages = [
  ['next', 'nextjs'],
  ['@tanstack/react-start', 'tanstack'],
  ['@tanstack/start', 'tanstack'],
  ['hono', 'hono'],
  ['express', 'express'],
  ['fastify', 'fastify'],
  ['astro', 'astro'],
  ['nuxt', 'nuxt'],
  ['@sveltejs/kit', 'sveltekit'],
  ['vite', 'vite'],
];

const integratedServerFrameworks = new Set(['nextjs', 'tanstack', 'nuxt', 'sveltekit']);
const backendFrameworks = new Set(['hono', 'express', 'fastify']);

const paymentSignals = [
  ['stripe', 'stripe'],
  ['@paypal/paypal-server-sdk', 'paypal'],
  ['@paypal/agent-toolkit', 'paypal'],
  ['dodopayments', 'dodo'],
  ['@dodopayments/', 'dodo'],
  ['@paddle/paddle-node-sdk', 'paddle'],
  ['@polar-sh/sdk', 'polar'],
  ['creem', 'creem'],
  ['alipay-sdk', 'alipay'],
  ['wechatpay', 'wechat-pay'],
];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function detectFromDependencies(dependencies, entries) {
  const matches = [];
  for (const [needle, value] of entries) {
    if (needle.endsWith('/')) {
      if (Object.keys(dependencies).some((name) => name.startsWith(needle))) matches.push(value);
    } else if (needle in dependencies) {
      matches.push(value);
    }
  }
  return [...new Set(matches)];
}

export async function inspectProject(inputPath = '.') {
  const projectDir = path.resolve(inputPath);
  const packagePath = path.join(projectDir, 'package.json');
  const packageJson = (await exists(packagePath))
    ? JSON.parse(await readFile(packagePath, 'utf8'))
    : null;

  const dependencies = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
  };

  const frameworks = detectFromDependencies(dependencies, frameworkPackages);
  const paymentDependencies = detectFromDependencies(dependencies, paymentSignals);
  const hasRootHtml = await exists(path.join(projectDir, 'index.html'));
  const hasPublicHtml = await exists(path.join(projectDir, 'public', 'index.html'));
  const hasHtml = hasRootHtml || hasPublicHtml;
  const serverDirectories = [];
  for (const directory of ['api', 'server', 'functions', 'netlify/functions']) {
    if (await exists(path.join(projectDir, directory))) serverDirectories.push(directory);
  }
  const integratedServer = frameworks.some((framework) => integratedServerFrameworks.has(framework));
  const backendServer = frameworks.some((framework) => backendFrameworks.has(framework)) || serverDirectories.length > 0;

  let projectKind = 'unknown';
  if (integratedServer) projectKind = 'fullstack';
  else if (backendServer && hasHtml) projectKind = 'html-with-backend';
  else if (backendServer) projectKind = 'backend';
  else if (hasHtml || frameworks.includes('vite')) projectKind = 'static-web';
  else if (packageJson) projectKind = 'javascript';

  let serverCapability = 'unknown';
  if (integratedServer) serverCapability = 'integrated';
  else if (backendServer) serverCapability = 'backend';
  else if (projectKind === 'static-web') serverCapability = 'external-required';

  let integrationTarget = 'other';
  if (frameworks.includes('nextjs')) integrationTarget = 'nextjs';
  else if (frameworks.includes('tanstack')) integrationTarget = 'tanstack';
  else if (frameworks.includes('hono')) integrationTarget = 'hono';
  else if (backendServer) integrationTarget = 'generic-node';
  else if (projectKind === 'static-web') integrationTarget = 'static-html';

  const lockfiles = [];
  for (const filename of ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lockb']) {
    if (await exists(path.join(projectDir, filename))) lockfiles.push(filename);
  }

  const safeEnvironmentKeys = [];
  const exampleEnvPath = path.join(projectDir, '.env.example');
  if (await exists(exampleEnvPath)) {
    const example = await readFile(exampleEnvPath, 'utf8');
    for (const line of example.split(/\r?\n/)) {
      const match = line.match(/^([A-Z][A-Z0-9_]+)=/);
      if (match && /(STRIPE|PAYPAL|DODO|PADDLE|POLAR|CREEM|ALIPAY|WECHAT|PAYMENT)/.test(match[1])) {
        safeEnvironmentKeys.push(match[1]);
      }
    }
  }

  return {
    projectDir,
    packageManager: lockfiles[0] ?? null,
    frameworks,
    projectKind,
    serverCapability,
    integrationTarget,
    hasHtml,
    serverDirectories,
    suggestedStack: integrationTarget,
    paymentDependencies,
    safeEnvironmentKeys,
    warnings: [
      ...(packageJson ? [] : ['No package.json found; inspect the project manually.']),
      ...(serverCapability === 'external-required'
        ? ['Static web project detected; dynamic checkout, verified webhooks, and entitlements require a trusted backend or serverless function.']
        : []),
      ...(paymentDependencies.length > 1
        ? ['Multiple payment SDK signals found; determine whether this is migration, fallback, or stale code.']
        : []),
    ],
  };
}

async function main() {
  try {
    const result = await inspectProject(process.argv[2] ?? '.');
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`Project inspection failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
