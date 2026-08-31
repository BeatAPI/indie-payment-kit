import { loadState, saveState } from './store';

export type EventStatus = 'processing' | 'succeeded' | 'failed';
const PROCESSING_LEASE_MS = 5 * 60 * 1000;

export async function beginEvent(provider: string, eventId: string): Promise<boolean> {
  const state = await loadState();
  const receipt = state.events.find((event) => event.provider === provider && event.eventId === eventId);
  if (receipt?.status === 'succeeded') return false;
  if (receipt?.status === 'processing') {
    const updatedAt = Date.parse(receipt.updatedAt);
    if (Number.isFinite(updatedAt) && Date.now() - updatedAt < PROCESSING_LEASE_MS) return false;
  }
  const now = new Date().toISOString();
  if (receipt) {
    receipt.status = 'processing';
    receipt.attempts += 1;
    receipt.error = null;
    receipt.updatedAt = now;
  } else {
    state.events.push({ provider, eventId, status: 'processing', attempts: 1, error: null, updatedAt: now });
  }
  await saveState(state);
  return true;
}

async function finishEvent(provider: string, eventId: string, status: EventStatus, error: string | null) {
  const state = await loadState();
  const receipt = state.events.find((event) => event.provider === provider && event.eventId === eventId);
  if (!receipt) throw new Error(`Missing event receipt for ${provider}:${eventId}`);
  receipt.status = status;
  receipt.error = error;
  receipt.updatedAt = new Date().toISOString();
  await saveState(state);
}

export async function completeEvent(provider: string, eventId: string): Promise<void> {
  await finishEvent(provider, eventId, 'succeeded', null);
}

export async function failEvent(provider: string, eventId: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await finishEvent(provider, eventId, 'failed', message);
}
