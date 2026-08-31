#!/usr/bin/env node

import { access, cp, lstat, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  assertSafeProjectWritePath,
  prepareSafeProjectDirectory,
  resolveSafeProjectTarget,
} from './safe-project-path.mjs';

const manifestUrl = new URL('../references/provider-packs.json', import.meta.url);
export const PACK_ROOT_SEGMENTS = ['.indie-payment-kit', 'packs'];
const DISCOVERY_ROOTS = ['.agents/skills', '.codex/skills', '.claude/skills', '.cursor/skills', '.github/skills', '.gemini/skills'];

export async function loadProviderPacks() {
  return JSON.parse(await readFile(manifestUrl, 'utf8'));
}

export function extractPinnedNpmPackage(installCommand) {
  if (!Array.isArray(installCommand)) return null;
  return (
    installCommand.find(
      (token) =>
        token !== 'npx' &&
        token !== '-y' &&
        typeof token === 'string' &&
        !token.startsWith('-') &&
        !/^https?:/i.test(token) &&
        /@.+\d/.test(token),
    ) ?? null
  );
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

  const skillsCliNeedsNames = pack.strategy === 'skills-cli';
  const canInstall = Array.isArray(pack.install) && (!skillsCliNeedsNames || entrySkills.length > 0);
  const installCommand = canInstall ? [...pack.install] : null;
  if (installCommand && skillsCliNeedsNames) {
    installCommand.push('--skill', ...entrySkills);
  }

  return {
    provider,
    billing,
    source: pack.source,
    sourceAuthority: pack.sourceAuthority,
    sourceType: pack.sourceType,
    verifiedAt: pack.verifiedAt,
    strategy: pack.strategy,
    installAvailable: Boolean(installCommand),
    installCommand,
    installerIntegrity: pack.installerIntegrity ?? null,
    pinnedNpmPackage: extractPinnedNpmPackage(installCommand),
    entrySkills,
    loadPolicy: pack.loadPolicy,
    userEntryPoint: false,
    isolatedRoot: PACK_ROOT_SEGMENTS.join('/'),
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

export function packRoot(project) {
  return path.join(path.resolve(project), ...PACK_ROOT_SEGMENTS);
}

export async function locateInstalledEntrySkills(project, entrySkills) {
  const projectDir = await realpath(path.resolve(project));
  const isolatedRoot = packRoot(projectDir);
  const matches = [];
  for (const skill of entrySkills) {
    const isolated = path.join(isolatedRoot, skill, 'SKILL.md');
    if (await exists(isolated)) {
      matches.push(isolated);
      continue;
    }
    for (const root of DISCOVERY_ROOTS) {
      const skillFile = path.join(projectDir, root, skill, 'SKILL.md');
      if (await exists(skillFile)) matches.push(skillFile);
    }
  }
  return [...new Set(matches)];
}

async function assertRegularProviderPackTree(root, current = root) {
  const information = await lstat(current);
  const relative = path.relative(root, current) || '.';
  if (information.isSymbolicLink()) {
    throw new Error(`Provider pack contains a symbolic link: ${relative}`);
  }
  if (information.isFile()) return;
  if (!information.isDirectory()) {
    throw new Error(`Provider pack contains an unsupported filesystem entry: ${relative}`);
  }

  for (const entry of await readdir(current)) {
    await assertRegularProviderPackTree(root, path.join(current, entry));
  }
}

export async function isolateProviderPacks(project, entrySkills, { sourceProject = project } = {}) {
  const projectDir = await resolveSafeProjectTarget(project);
  const sourceDir = path.resolve(sourceProject);
  const isolatedRoot = packRoot(projectDir);
  await prepareSafeProjectDirectory(projectDir, PACK_ROOT_SEGMENTS.join('/'));
  const isolated = [];

  for (const skill of entrySkills) {
    const relativeDestination = path.join(...PACK_ROOT_SEGMENTS, skill);
    await assertSafeProjectWritePath(projectDir, relativeDestination);
    const destination = path.join(isolatedRoot, skill);
    const destinationSkill = path.join(destination, 'SKILL.md');
    const sources = [];
    for (const root of DISCOVERY_ROOTS) {
      const skillDir = path.join(sourceDir, root, skill);
      if (await exists(path.join(skillDir, 'SKILL.md'))) sources.push(skillDir);
    }

    if (sources[0]) {
      await assertRegularProviderPackTree(sources[0]);
      await cp(sources[0], destination, { recursive: true, force: true });
      await assertRegularProviderPackTree(destination);
      await assertSafeProjectWritePath(projectDir, path.join(relativeDestination, 'SKILL.md'));
    }

    if (await exists(destinationSkill)) isolated.push(destinationSkill);
  }

  return isolated;
}

export async function resolveSafeInstallTarget(project) {
  return await resolveSafeProjectTarget(project);
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
    `Isolated pack root: ${pack.isolatedRoot}`,
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

export async function readNpmIntegrity(spec) {
  const environment = buildInstallerEnvironment();
  return await new Promise((resolve, reject) => {
    const child = spawn('npm', ['view', spec, 'dist.integrity'], {
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `npm view exited with ${signal ? `signal ${signal}` : `code ${code}`}.`));
    });
  });
}

export async function assertInstallerIntegrity(spec, expected, { readIntegrity = readNpmIntegrity } = {}) {
  if (!spec) throw new Error('Missing pinned npm package for installer integrity verification.');
  if (!expected) throw new Error(`Missing installer integrity metadata for ${spec}.`);
  const actual = await readIntegrity(spec);
  if (actual !== expected) {
    throw new Error(`Installer integrity mismatch for ${spec}.`);
  }
}

async function runInstall(command, cwd, integrity) {
  const spec = extractPinnedNpmPackage(command);
  if (integrity) await assertInstallerIntegrity(spec, integrity);
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

export async function installProviderPack({ project, pack, runInstaller = runInstall }) {
  if (!pack.installCommand) {
    throw new Error(`${pack.provider} does not have a declared universal provider-pack installer.`);
  }

  const projectDir = await resolveSafeInstallTarget(project);
  const staging = await mkdtemp(path.join(tmpdir(), 'indie-payment-kit-pack-'));
  try {
    await writeFile(
      path.join(staging, 'package.json'),
      '{"name":"indie-payment-kit-provider-stage","private":true}\n',
    );
    await runInstaller(pack.installCommand, staging, pack.installerIntegrity);
    const discovered = await locateInstalledEntrySkills(staging, pack.entrySkills);
    const found = new Set(discovered.map((item) => path.basename(path.dirname(item))));
    const missing = pack.entrySkills.filter((skill) => !found.has(skill));
    if (missing.length) {
      throw new Error(`Official provider pack did not contain required Skills: ${missing.join(', ')}`);
    }
    return await isolateProviderPacks(projectDir, pack.entrySkills, { sourceProject: staging });
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const pack = resolveProviderPack(await loadProviderPacks(), args.provider, args.billing);
    if (args.install) {
      if (!args.yes) throw new Error('--install requires --yes after the user has approved the external download.');
      if (!pack.installCommand) throw new Error(`${pack.provider} does not have a declared universal provider-pack installer.`);
      pack.installedSkillPaths = await installProviderPack({ project: args.project, pack });
    }
    if (!args.install && args.locate) {
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
