import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, readFile, realpath, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  assertInstallerIntegrity,
  buildInstallerEnvironment,
  extractPinnedNpmPackage,
  installProviderPack,
  isolateProviderPacks,
  loadProviderPacks,
  locateInstalledEntrySkills,
  resolveProviderPack,
  resolveSafeInstallTarget,
} from '../skills/indie-payment-kit/scripts/provider-pack.mjs';

test('provider-pack manifest covers all catalog providers with one internal user boundary', async () => {
  const manifest = await loadProviderPacks();
  assert.equal(Object.keys(manifest.providers).length, 8);

  for (const pack of Object.values(manifest.providers)) {
    assert.equal(pack.sourceAuthority, 'official-provider');
    assert.match(pack.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
  }

  const stripe = resolveProviderPack(manifest, 'stripe', 'subscription');
  assert.equal(stripe.installAvailable, true);
  assert.equal(stripe.installCommand[0], 'npx');
  assert.equal(stripe.installCommand[2], 'skills@1.5.23');
  const agentIndex = stripe.installCommand.indexOf('--agent');
  assert.equal(stripe.installCommand[agentIndex + 1], 'codex');
  assert.match(stripe.installerIntegrity, /^sha512-/);
  assert.equal(stripe.userEntryPoint, false);
});

test('provider packs use currently discoverable official skills without invented entry names', async () => {
  const manifest = await loadProviderPacks();

  const alipay = resolveProviderPack(manifest, 'alipay', 'one-time');
  assert.equal(alipay.source, 'https://github.com/alipay/payment-skills');
  assert.deepEqual(alipay.entrySkills, ['alipay-payment-skill']);
  assert.equal(alipay.installAvailable, true);

  const paypal = resolveProviderPack(manifest, 'paypal', 'subscription');
  assert.deepEqual(paypal.entrySkills, ['paypal-best-practices']);
  assert.equal(paypal.installAvailable, true);

  const paddle = resolveProviderPack(manifest, 'paddle', 'subscription');
  assert.ok(paddle.entrySkills.includes('paddle-checkout-web'));
  assert.ok(paddle.entrySkills.includes('paddle-webhooks'));
  assert.ok(paddle.entrySkills.includes('paddle-subscription-sync'));
  assert.equal(paddle.installAvailable, true);

  const polar = resolveProviderPack(manifest, 'polar', 'subscription');
  assert.deepEqual(polar.entrySkills, ['polar-integration', 'polar-testing']);
  assert.equal(polar.installAvailable, true);

  const creem = resolveProviderPack(manifest, 'creem', 'subscription');
  assert.equal(creem.installAvailable, false);
  assert.equal(creem.sourceType, 'official-skill-manual');
});

test('installed provider entry skills can be located without a host index refresh', async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-pack-'));
  const skillDirectory = path.join(project, '.agents', 'skills', 'checkout-integration');
  await mkdir(skillDirectory, { recursive: true });
  await writeFile(path.join(skillDirectory, 'SKILL.md'), '# Checkout');

  const paths = await locateInstalledEntrySkills(project, ['checkout-integration']);
  assert.deepEqual(paths, [path.join(await realpath(project), '.agents', 'skills', 'checkout-integration', 'SKILL.md')]);
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
  const pack = resolveProviderPack(await loadProviderPacks(), 'creem', 'one-time');
  assert.equal(pack.installAvailable, false);
  assert.equal(pack.installCommand, null);
  assert.equal(pack.strategy, 'official-docs');
  assert.equal(pack.sourceType, 'official-skill-manual');
});

test('Polar does not install an unbounded skill dump', async () => {
  const pack = resolveProviderPack(await loadProviderPacks(), 'polar', 'subscription');
  assert.equal(pack.installAvailable, true);
  assert.deepEqual(pack.entrySkills, ['polar-integration', 'polar-testing']);
  assert.equal(pack.installCommand.includes('polar-setup'), false);
  assert.equal(pack.installCommand.includes('polar-migrate'), false);
});

test('installer commands pin and can verify npm package integrity', async () => {
  const pack = resolveProviderPack(await loadProviderPacks(), 'stripe', 'one-time');
  assert.equal(extractPinnedNpmPackage(pack.installCommand), 'skills@1.5.23');
  await assertInstallerIntegrity('skills@1.5.23', pack.installerIntegrity, {
    readIntegrity: async () => pack.installerIntegrity,
  });
  await assert.rejects(
    () => assertInstallerIntegrity('skills@1.5.23', pack.installerIntegrity, { readIntegrity: async () => 'sha512-other' }),
    /integrity mismatch/,
  );
});

test('provider packs are copied from staging without deleting user-owned skills', async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-isolate-'));
  const staging = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-stage-'));
  const userSkill = path.join(project, '.agents', 'skills', 'stripe-best-practices');
  const stagedSkill = path.join(staging, '.agents', 'skills', 'stripe-best-practices');
  await mkdir(userSkill, { recursive: true });
  await mkdir(stagedSkill, { recursive: true });
  await writeFile(path.join(userSkill, 'SKILL.md'), '# User Stripe\n');
  await writeFile(path.join(stagedSkill, 'SKILL.md'), '# Official Stripe\n');

  const isolated = await isolateProviderPacks(project, ['stripe-best-practices'], { sourceProject: staging });
  const expected = path.join(await realpath(project), '.indie-payment-kit', 'packs', 'stripe-best-practices', 'SKILL.md');
  assert.deepEqual(isolated, [expected]);
  assert.equal(await locateInstalledEntrySkills(project, ['stripe-best-practices']).then((paths) => paths[0]), expected);
  assert.equal(await readFile(path.join(userSkill, 'SKILL.md'), 'utf8'), '# User Stripe\n');
  assert.equal(await readFile(expected, 'utf8'), '# Official Stripe\n');
});

test('provider pack isolation rejects repository symlinks instead of writing outside the project', async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-pack-link-'));
  const staging = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-pack-link-stage-'));
  const outside = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-pack-link-outside-'));
  const stagedSkill = path.join(staging, '.agents', 'skills', 'stripe-best-practices');
  await mkdir(stagedSkill, { recursive: true });
  await writeFile(path.join(stagedSkill, 'SKILL.md'), '# Official Stripe\n');
  await symlink(outside, path.join(project, '.indie-payment-kit'));

  await assert.rejects(
    () => isolateProviderPacks(project, ['stripe-best-practices'], { sourceProject: staging }),
    /symbolic link/,
  );
  await assert.rejects(() => access(path.join(outside, 'packs', 'stripe-best-practices', 'SKILL.md')));
});

test('provider pack isolation rejects nested symlinks from staged provider content', async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-pack-nested-link-'));
  const staging = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-pack-nested-link-stage-'));
  const outside = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-pack-nested-link-outside-'));
  const stagedSkill = path.join(staging, '.agents', 'skills', 'stripe-best-practices');
  await mkdir(path.join(stagedSkill, 'references'), { recursive: true });
  await writeFile(path.join(stagedSkill, 'SKILL.md'), '# Official Stripe\n');
  await writeFile(path.join(outside, 'secret.md'), 'not provider-pack content\n');
  await symlink(path.join(outside, 'secret.md'), path.join(stagedSkill, 'references', 'unsafe.md'));

  await assert.rejects(
    () => isolateProviderPacks(project, ['stripe-best-practices'], { sourceProject: staging }),
    /contains a symbolic link/,
  );
  await assert.rejects(
    () => access(path.join(project, '.indie-payment-kit', 'packs', 'stripe-best-practices', 'SKILL.md')),
  );
});

test('provider installer runs outside the user project and publishes only isolated skills', async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'indie-payment-kit-install-'));
  const pack = resolveProviderPack(await loadProviderPacks(), 'stripe', 'one-time');
  let installerDirectory = null;

  const installed = await installProviderPack({
    project,
    pack,
    runInstaller: async (_command, cwd) => {
      installerDirectory = cwd;
      await access(path.join(cwd, 'package.json'));
      const skill = path.join(cwd, '.agents', 'skills', 'stripe-best-practices');
      await mkdir(skill, { recursive: true });
      await writeFile(path.join(skill, 'SKILL.md'), '# Staged Stripe\n');
    },
  });

  assert.notEqual(installerDirectory, project);
  assert.equal(installed.length, 1);
  assert.ok(installed[0].endsWith('/.indie-payment-kit/packs/stripe-best-practices/SKILL.md'));
  await assert.rejects(() => access(path.join(project, '.agents', 'skills', 'stripe-best-practices', 'SKILL.md')));
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
