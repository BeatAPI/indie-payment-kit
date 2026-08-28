#!/usr/bin/env node

import { access, readFile, realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const manifestUrl = new URL('../references/provider-packs.json', import.meta.url);

export async function loadProviderPacks() {
  return JSON.parse(await readFile(manifestUrl, 'utf8'));
}

export function resolveProviderPack(manifest, provider, billing = 'one-time') {
  const pack = manifest.providers[provider];
  if (!pack) throw new Error(`Unknown provider pack: ${provider}`);

  if (!Array.isArray(pack.entrySkills) || !pack.entrySkills.every((skill) => /^[a-z0-9][a-z0-9-]*$/.test(skill))) {
    throw new Error(`Provider pack ${provider} contains an unsafe internal Skill name.`);
  }
  if (
    pack.install &&
    (!Array.isArray(pack.install) ||
      pack.install[0] !== 'npx' ||
      pack.install.some((token) => typeof token !== 'string' || /[;&|`$\n\r]/.test(token)))
  ) {
    throw new Error(`Provider pack ${provider} contains an unsafe installer command.`);
  }

  const entrySkills = [...pack.entrySkills];
  for (const skill of pack.capabilitySkills?.[billing] ?? []) {
    if (!entrySkills.includes(skill)) entrySkills.push(skill);
  }

  const installCommand = pack.install ? [...pack.install] : null;
  if (installCommand && pack.strategy === 'skills-cli' && entrySkills.length > 0) {
    installCommand.push('--skill', ...entrySkills);
  }

  return {
    provider,
    billing,
    source: pack.source,
    strategy: pack.strategy,
    installAvailable: Array.isArray(pack.install),
    installCommand,
    installerIntegrity: pack.installerIntegrity ?? null,
    entrySkills,
    loadPolicy: pack.loadPolicy,
    userEntryPoint: false,
  };
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function locateInstalledEntrySkills(project, entrySkills) {
  const projectDir = path.resolve(project);
  const roots = ['.agents/skills', '.codex/skills', '.claude/skills', '.cursor/skills', '.github/skills', '.gemini/skills'];
  const matches = [];
  for (const skill of entrySkills) {
    for (const root of roots) {
      const skillFile = path.join(projectDir, root, skill, 'SKILL.md');
      if (await exists(skillFile)) matches.push(skillFile);
    }
  }
  return [...new Set(matches)];
}

export async function resolveSafeInstallTarget(project) {
  const resolved = await realpath(path.resolve(project));
  const information = await stat(resolved);
  if (!information.isDirectory()) throw new Error('Provider packs can only be installed into a project directory.');
  if (resolved === path.parse(resolved).root || resolved === homedir()) {
    throw new Error('Refusing to install a provider pack into a broad system or home directory. Choose the project directory explicitly.');
  }
  return resolved;
}

function parseArgs(argv) {
  const result = { billing: 'one-time', format: 'markdown', install: false, locate: false, yes: false, project: '.' };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--install' || token === '--locate' || token === '--yes') {
      result[token.slice(2)] = true;
      continue;
    }
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    if (!['provider', 'billing', 'format', 'project'].includes(key)) throw new Error(`Unknown option: ${token}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${token}`);
    result[key] = value;
    index += 1;
  }
  if (!result.provider) throw new Error('--provider is required');
  if (!['one-time', 'subscription', 'usage', 'credits'].includes(result.billing)) throw new Error(`Invalid billing model: ${result.billing}`);
  if (!['markdown', 'json'].includes(result.format)) throw new Error(`Invalid format: ${result.format}`);
  return result;
}

function renderMarkdown(pack) {
  return [
    `# ${pack.provider} provider pack`,
    '',
    `Source: ${pack.source}`,
    `Strategy: ${pack.strategy}`,
    `Install available: ${pack.installAvailable ? 'yes' : 'no'}`,
    `Internal entry skills: ${pack.entrySkills.length ? pack.entrySkills.join(', ') : 'current official docs/toolkit'}`,
    `User-facing entry point: indie-payment-kit only`,
    '',
    pack.installCommand ? `Planned command: ${pack.installCommand.join(' ')}` : 'No universal installer is currently declared.',
    '',
    `Load policy: ${pack.loadPolicy}`,
    ...(pack.installedSkillPaths?.length
      ? ['', 'Installed entry skill paths:', ...pack.installedSkillPaths.map((item) => `- ${item}`)]
      : []),
    '',
  ].join('\n');
}

export function buildInstallerEnvironment(source = process.env) {
  const environment = {};
  for (const key of [
    'PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL',
    'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY', 'NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE', 'SSL_CERT_DIR',
  ]) {
    if (source[key]) environment[key] = source[key];
  }
  environment.DISABLE_TELEMETRY = '1';
  environment.DO_NOT_TRACK = '1';
  return environment;
}

async function runInstall(command, cwd) {
  const environment = buildInstallerEnvironment();

  await new Promise((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), {
      cwd,
      env: environment,
      stdio: 'inherit',
      shell: false,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Provider pack installer exited with ${signal ? `signal ${signal}` : `code ${code}`}.`));
    });
  });
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const pack = resolveProviderPack(await loadProviderPacks(), args.provider, args.billing);
    if (args.install) {
      if (!args.yes) throw new Error('--install requires --yes after the user has approved the external download.');
      if (!pack.installCommand) throw new Error(`${pack.provider} does not have a declared universal provider-pack installer.`);
      await runInstall(pack.installCommand, await resolveSafeInstallTarget(args.project));
    }
    if (args.install || args.locate) {
      pack.installedSkillPaths = await locateInstalledEntrySkills(args.project, pack.entrySkills);
    }
    process.stdout.write(args.format === 'json' ? `${JSON.stringify(pack, null, 2)}\n` : renderMarkdown(pack));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
