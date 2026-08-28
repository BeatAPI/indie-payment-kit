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
  ['astro', 'astro'],
  ['nuxt', 'nuxt'],
  ['svelte', 'svelte'],
];

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
    suggestedStack: frameworks.find((item) => ['nextjs', 'tanstack', 'hono'].includes(item)) ?? 'other',
    paymentDependencies,
    safeEnvironmentKeys,
    warnings: [
      ...(packageJson ? [] : ['No package.json found; inspect the project manually.']),
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
