#!/usr/bin/env node

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillRoot = path.join(root, 'skills', 'indie-payment-kit');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist'].includes(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(entryPath)));
    else files.push(entryPath);
  }
  return files;
}

async function main() {
  const manifest = await readJson('.codex-plugin/plugin.json');
  assert(manifest.name === 'indie-payment-kit', 'Plugin name must match the repo and skill.');
  assert(/^\d+\.\d+\.\d+$/.test(manifest.version), 'Plugin version must use strict semver.');
  assert(manifest.author?.name === 'BeatAPI', 'Plugin publisher must be BeatAPI.');
  assert(manifest.skills === './skills/', 'Plugin must expose the skills directory.');

  const packageJson = await readJson('package.json');
  assert(packageJson.version === manifest.version, 'package.json and plugin versions must match.');

  const skill = await readFile(path.join(skillRoot, 'SKILL.md'), 'utf8');
  assert(skill.startsWith('---\nname: indie-payment-kit\n'), 'Skill frontmatter is missing or invalid.');
  assert(!skill.includes('[TODO:'), 'Skill contains unfinished scaffold placeholders.');
  assert(skill.includes('Never finish by telling the user to invoke'), 'Skill must preserve the single-entry invariant.');

  const openaiYaml = await readFile(path.join(skillRoot, 'agents', 'openai.yaml'), 'utf8');
  assert(openaiYaml.includes('$indie-payment-kit'), 'Default prompt must mention $indie-payment-kit.');

  const catalog = await readJson('skills/indie-payment-kit/references/provider-catalog.json');
  assert(catalog.schemaVersion === 2, 'Unsupported provider catalog schema.');
  assert(catalog.providers.length === 8, 'The provider catalog must contain exactly eight providers.');

  const providerPacks = await readJson('skills/indie-payment-kit/references/provider-packs.json');
  assert(providerPacks.schemaVersion === 1, 'Unsupported provider-pack schema.');
  assert(new Set(Object.keys(providerPacks.providers)).size === 8, 'Provider-pack manifest must contain exactly eight providers.');

  const ids = new Set();
  for (const provider of catalog.providers) {
    assert(!ids.has(provider.id), `Duplicate provider id: ${provider.id}`);
    ids.add(provider.id);
    assert(provider.officialSkill.startsWith('https://'), `${provider.id} official Skill URL must be HTTPS.`);
    assert(provider.officialDocs.startsWith('https://'), `${provider.id} docs URL must be HTTPS.`);
    const adapterPath = path.join(skillRoot, 'references', provider.adapter);
    await readFile(adapterPath, 'utf8');
    assert(provider.id in providerPacks.providers, `${provider.id} is missing from provider-packs.json.`);
  }

  for (const [providerId, pack] of Object.entries(providerPacks.providers)) {
    assert(ids.has(providerId), `Unknown provider pack: ${providerId}`);
    assert(pack.source.startsWith('https://'), `${providerId} provider-pack source must be HTTPS.`);
    assert(
      Array.isArray(pack.entrySkills) && pack.entrySkills.every((skill) => /^[a-z0-9][a-z0-9-]*$/.test(skill)),
      `${providerId} contains an unsafe internal Skill name.`,
    );
    if (pack.install) {
      assert(Array.isArray(pack.install) && pack.install.length >= 3, `${providerId} install command is invalid.`);
      assert(pack.install[0] === 'npx', `${providerId} installer must use the allowlisted npx executable.`);
      assert(!pack.install.some((token) => /[;&|`$\n\r]/.test(token)), `${providerId} installer contains shell control characters.`);
      assert(!pack.install.some((token) => token.includes('@latest')), `${providerId} installer must not use a floating npm latest tag.`);
      assert(/^sha512-[A-Za-z0-9+/]+=*$/.test(pack.installerIntegrity), `${providerId} installer integrity metadata is missing.`);
    }
  }

  const verifiedAt = new Date(`${catalog.verifiedAt}T00:00:00Z`);
  const ageDays = (Date.now() - verifiedAt.getTime()) / 86_400_000;
  assert(ageDays <= 180, 'Provider sources are older than 180 days; refresh official-source verification.');

  for (const required of ['README.md', 'docs/PRD.md', 'docs/ARCHITECTURE.md', 'SECURITY.md']) {
    await readFile(path.join(root, required), 'utf8');
  }

  const secretPatterns = [/sk_live_[A-Za-z0-9]{12,}/, /gh[opusr]_[A-Za-z0-9]{20,}/];
  for (const file of await walk(root)) {
    if (!/\.(?:md|json|mjs|yaml|yml)$/.test(file)) continue;
    const content = await readFile(file, 'utf8');
    for (const pattern of secretPatterns) {
      assert(!pattern.test(content), `Possible live credential found in ${path.relative(root, file)}.`);
    }
  }

  process.stdout.write(`Validated Indie Payment Kit v${manifest.version}: ${catalog.providers.length} providers and ${Object.keys(providerPacks.providers).length} managed provider sources, current as of ${catalog.verifiedAt}.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
