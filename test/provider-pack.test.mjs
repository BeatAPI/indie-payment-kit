import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  buildInstallerEnvironment,
  loadProviderPacks,
  locateInstalledEntrySkills,
  resolveProviderPack,
  resolveSafeInstallTarget,
} from '../skills/indie-payment-kit/scripts/provider-pack.mjs';

test('provider-pack manifest covers all catalog providers with one internal user boundary', async () => {
  const manifest = await loadProviderPacks();
  assert.equal(Object.keys(manifest.providers).length, 8);

  const stripe = resolveProviderPack(manifest, 'stripe', 'subscription');
  assert.equal(stripe.installAvailable, true);
  assert.equal(stripe.installCommand[0], 'npx');
  assert.equal(stripe.installCommand[2], 'skills@1.5.23');
  assert.match(stripe.installerIntegrity, /^sha512-/);
  assert.equal(stripe.userEntryPoint, false);
});

test('installed provider entry skills can be located without a host index refresh', async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-pack-'));
  const skillDirectory = path.join(project, '.agents', 'skills', 'checkout-integration');
  await mkdir(skillDirectory, { recursive: true });
  await writeFile(path.join(skillDirectory, 'SKILL.md'), '# Checkout');

  const paths = await locateInstalledEntrySkills(project, ['checkout-integration']);
  assert.deepEqual(paths, [path.join(skillDirectory, 'SKILL.md')]);
});

test('Dodo pack adds only the billing capability needed by the plan', async () => {
  const pack = resolveProviderPack(await loadProviderPacks(), 'dodo', 'subscription');
  assert.ok(pack.entrySkills.includes('checkout-integration'));
  assert.ok(pack.entrySkills.includes('webhook-integration'));
  assert.ok(pack.entrySkills.includes('subscription-integration'));
  assert.equal(pack.entrySkills.includes('credit-based-billing'), false);
  assert.ok(pack.installCommand.includes('subscription-integration'));
  assert.equal(pack.installCommand.includes('credit-based-billing'), false);
});

test('providers without a universal installer remain usable through official sources', async () => {
  const pack = resolveProviderPack(await loadProviderPacks(), 'paypal', 'one-time');
  assert.equal(pack.installAvailable, false);
  assert.equal(pack.installCommand, null);
  assert.equal(pack.strategy, 'official-docs');
});

test('unknown provider names cannot influence an install command', async () => {
  assert.throws(
    () => resolveProviderPack({ providers: {} }, 'stripe; touch unsafe', 'one-time'),
    /Unknown provider pack/
  );
});

test('unsafe provider-pack skill paths and commands are rejected', () => {
  assert.throws(
    () => resolveProviderPack({ providers: { bad: { entrySkills: ['../../escape'], install: ['npx', 'safe'] } } }, 'bad'),
    /unsafe internal Skill name/,
  );
  assert.throws(
    () => resolveProviderPack({ providers: { bad: { entrySkills: [], install: ['npx', 'safe;touch', 'x'] } } }, 'bad'),
    /unsafe installer command/,
  );
});

test('broad install targets are rejected before any installer starts', async () => {
  await assert.rejects(() => resolveSafeInstallTarget('/'), /broad system or home directory/);
});

test('provider installers receive a minimal environment with telemetry disabled', () => {
  const environment = buildInstallerEnvironment({
    PATH: '/bin',
    HOME: '/tmp/example-home',
    STRIPE_SECRET_KEY: 'must-not-be-inherited',
  });
  assert.equal(environment.PATH, '/bin');
  assert.equal(environment.HOME, '/tmp/example-home');
  assert.equal(environment.STRIPE_SECRET_KEY, undefined);
  assert.equal(environment.DISABLE_TELEMETRY, '1');
  assert.equal(environment.DO_NOT_TRACK, '1');
});
