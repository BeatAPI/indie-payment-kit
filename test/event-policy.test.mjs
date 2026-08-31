import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_EVENT_LEASE_MS,
  shouldBeginEvent,
} from '../skills/indie-payment-kit/scripts/event-policy.mjs';

const eventsTemplate = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../skills/indie-payment-kit/templates/nextjs/lib/payments/events.ts',
);

test('succeeded and actively processing receipts are duplicates', () => {
  const now = Date.parse('2026-08-31T08:00:00.000Z');
  assert.equal(DEFAULT_EVENT_LEASE_MS, 5 * 60 * 1000);
  assert.equal(shouldBeginEvent(undefined), true);
  assert.equal(shouldBeginEvent({ status: 'failed' }), true);
  assert.equal(shouldBeginEvent({ status: 'processing', updatedAt: '2026-08-31T07:59:00.000Z' }, now), false);
  assert.equal(shouldBeginEvent({ status: 'succeeded' }), false);
});

test('interrupted processing can be retried after its lease expires', () => {
  const receipts = new Map();
  let now = Date.parse('2026-08-31T08:00:00.000Z');

  function begin(id) {
    const receipt = receipts.get(id);
    if (!shouldBeginEvent(receipt, now)) return false;
    receipts.set(id, {
      status: 'processing',
      attempts: (receipt?.attempts ?? 0) + 1,
      updatedAt: new Date(now).toISOString(),
    });
    return true;
  }

  assert.equal(begin('evt_1'), true);
  assert.equal(begin('evt_1'), false);
  now += DEFAULT_EVENT_LEASE_MS;
  assert.equal(begin('evt_1'), true);
  receipts.set('evt_1', { status: 'failed', attempts: 2 });
  assert.equal(begin('evt_1'), true);
  receipts.set('evt_1', { status: 'succeeded', attempts: 3 });
  assert.equal(begin('evt_1'), false);
});

test('Next.js event template matches the retry policy', async () => {
  const source = await readFile(eventsTemplate, 'utf8');
  assert.match(source, /receipt\?\.status === 'succeeded'/);
  assert.match(source, /receipt\?\.status === 'processing'/);
  assert.match(source, /const PROCESSING_LEASE_MS = 5 \* 60 \* 1000/);
});
