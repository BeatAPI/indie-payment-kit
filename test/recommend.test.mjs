import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loadCatalog,
  recommendFromCatalog,
} from '../skills/indie-payment-kit/scripts/recommend.mjs';

const base = {
  market: 'global',
  entity: 'individual',
  product: 'saas',
  billing: 'subscription',
  tax: 'managed',
  stack: 'nextjs',
};

test('catalog contains eight unique official-source providers', async () => {
  const catalog = await loadCatalog();
  assert.equal(catalog.providers.length, 8);
  assert.equal(new Set(catalog.providers.map((provider) => provider.id)).size, 8);
  assert.ok(catalog.providers.every((provider) => provider.officialSkill.startsWith('https://')));
});

test('global individual SaaS with managed tax prefers a MoR route', async () => {
  const result = recommendFromCatalog(await loadCatalog(), base);
  assert.equal(result.strategy, 'single-route');
  assert.equal(result.recommendations[0].provider, 'dodo');
  assert.equal(result.recommendations[0].route, 'mor');
});

test('global business with self-managed tax prefers direct processing', async () => {
  const result = recommendFromCatalog(await loadCatalog(), {
    ...base,
    entity: 'global-business',
    tax: 'self',
  });
  assert.equal(result.recommendations[0].provider, 'stripe');
  assert.equal(result.recommendations[0].route, 'direct');
});

test('mainland China business prefers a domestic payment route', async () => {
  const result = recommendFromCatalog(await loadCatalog(), {
    ...base,
    market: 'china',
    entity: 'china-business',
    product: 'digital-goods',
    billing: 'one-time',
    tax: 'self',
    stack: 'tanstack',
  });
  assert.equal(result.recommendations[0].provider, 'alipay');
  assert.equal(result.recommendations[0].route, 'china-domestic');
});

test('dual-market profile returns distinct global and China rails', async () => {
  const result = recommendFromCatalog(await loadCatalog(), {
    ...base,
    market: 'both',
    entity: 'china-business',
    billing: 'one-time',
  });
  assert.equal(result.strategy, 'dual-market');
  assert.deepEqual(result.recommendations.map((item) => item.role), [
    'global-primary',
    'china-primary',
  ]);
  assert.notEqual(result.recommendations[0].route, result.recommendations[1].route);
});

test('physical goods do not route to a digital-goods MoR', async () => {
  const result = recommendFromCatalog(await loadCatalog(), {
    ...base,
    entity: 'global-business',
    product: 'physical',
  });
  assert.equal(result.recommendations[0].route, 'direct');
});
