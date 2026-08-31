export const DEFAULT_EVENT_LEASE_MS = 5 * 60 * 1000;

export function shouldBeginEvent(receipt, now = Date.now(), leaseMs = DEFAULT_EVENT_LEASE_MS) {
  if (!receipt || receipt.status === 'failed') return true;
  if (receipt.status === 'succeeded') return false;
  const updatedAt = Date.parse(receipt.updatedAt ?? '');
  return !Number.isFinite(updatedAt) || now - updatedAt >= leaseMs;
}
