#!/usr/bin/env node

import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createIntegrationPlan } from './plan-integration.mjs';
import {
  assertSafeProjectWritePath,
  prepareSafeProjectFile,
  resolveSafeProjectTarget,
} from './safe-project-path.mjs';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function mergeEnvExample(project, keys) {
  if (!keys.length) return false;
  const file = await assertSafeProjectWritePath(project, '.env.example');
  let current = '';
  try {
    current = await readFile(file, 'utf8');
  } catch {
    current = '';
  }
  const missing = keys.filter((key) => !new RegExp(`^${key}=`, 'm').test(current));
  if (!missing.length) return false;
  const prefix = current.trim() ? `${current.trim()}\n` : '';
  await writeFile(
    await prepareSafeProjectFile(project, '.env.example'),
    `${prefix}${missing.map((key) => `${key}=`).join('\n')}\n`,
  );
  return true;
}

async function ensureGitignore(project) {
  const file = await assertSafeProjectWritePath(project, '.gitignore');
  let current = '';
  try {
    current = await readFile(file, 'utf8');
  } catch {
    current = '';
  }
  if (current.includes('.indie-payment-kit/state.json')) return false;
  const prefix = current.trim() ? `${current.trim()}\n` : '';
  await writeFile(
    await prepareSafeProjectFile(project, '.gitignore'),
    `${prefix}.indie-payment-kit/state.json\n`,
  );
  return true;
}

export async function materializeIntegration({ project = '.', provider, billing = 'one-time', force = false }) {
  const projectDir = await resolveSafeProjectTarget(project);
  const plan = await createIntegrationPlan({ project: projectDir, provider, billing });
  const written = [];
  const skipped = [];

  if (plan.implementationMode === 'payment-link' || plan.templateFiles.length === 0) {
    const reason = plan.integrationApproach === 'extend-existing'
      ? 'extend-existing'
      : plan.implementationMode === 'payment-link'
        ? 'payment-link'
        : 'agent-guided';
    return {
      plan,
      written,
      skipped,
      envUpdated: false,
      gitignoreUpdated: false,
      reason,
    };
  }

  for (const file of plan.templateFiles) {
    const destination = await assertSafeProjectWritePath(projectDir, file.to);
    if (!force && (await exists(destination))) {
      skipped.push(file.to);
      continue;
    }
    const source = path.join(skillRoot, file.from);
    const sourceContent = await readFile(source, 'utf8');
    const content = sourceContent.replaceAll(
      '__STRIPE_CHECKOUT_MODE__',
      plan.billing === 'subscription' ? 'subscription' : 'payment',
    );
    await writeFile(await prepareSafeProjectFile(projectDir, file.to), content);
    written.push(file.to);
  }

  const envUpdated = await mergeEnvExample(projectDir, plan.requiredEnvironmentKeys);
  const gitignoreUpdated = await ensureGitignore(projectDir);

  return { plan, written, skipped, envUpdated, gitignoreUpdated, reason: 'written' };
}

function parseArgs(argv) {
  const result = { project: '.', billing: 'one-time', format: 'markdown', force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--force') {
      result.force = true;
      continue;
    }
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${token}`);
    result[token.slice(2)] = value;
    index += 1;
  }
  if (!result.provider) throw new Error('--provider is required');
  return result;
}

function renderMarkdown(result) {
  return [
    '# Materialized payment integration',
    '',
    `Provider: **${result.plan.provider}**`,
    `Reason: **${result.reason}**`,
    '',
    '## Written',
    '',
    ...(result.written.length ? result.written.map((file) => `- ${file}`) : ['- none']),
    '',
    '## Skipped existing files',
    '',
    ...(result.skipped.length ? result.skipped.map((file) => `- ${file}`) : ['- none']),
    '',
    `Environment example updated: ${result.envUpdated ? 'yes' : 'no'}`,
    `Gitignore updated: ${result.gitignoreUpdated ? 'yes' : 'no'}`,
    '',
    result.plan.packagesToInstall.length
      ? `Install in the target project: ${result.plan.packagesToInstall.join(', ')}`
      : '',
    '',
  ].join('\n');
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = await materializeIntegration(args);
    process.stdout.write(args.format === 'json' ? `${JSON.stringify(result, null, 2)}\n` : renderMarkdown(result));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
