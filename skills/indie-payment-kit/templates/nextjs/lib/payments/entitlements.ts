import { loadState, saveState, type Entitlement } from './store';

export async function grantEntitlement(customerId: string, sku: string, sourceOrderId: string | null): Promise<Entitlement> {
  const state = await loadState();
  const now = new Date().toISOString();
  let entitlement = state.entitlements.find((item) => item.customerId === customerId && item.sku === sku);
  if (!entitlement) {
    entitlement = { customerId, sku, active: true, sourceOrderId, updatedAt: now };
    state.entitlements.push(entitlement);
  } else {
    entitlement.active = true;
    entitlement.sourceOrderId = sourceOrderId;
    entitlement.updatedAt = now;
  }
  await saveState(state);
  return entitlement;
}

export async function revokeEntitlement(customerId: string, sku: string): Promise<void> {
  const state = await loadState();
  const entitlement = state.entitlements.find((item) => item.customerId === customerId && item.sku === sku);
  if (!entitlement) return;
  entitlement.active = false;
  entitlement.updatedAt = new Date().toISOString();
  await saveState(state);
}

export async function hasEntitlement(customerId: string, sku: string): Promise<boolean> {
  const state = await loadState();
  return Boolean(state.entitlements.find((item) => item.customerId === customerId && item.sku === sku && item.active));
}
