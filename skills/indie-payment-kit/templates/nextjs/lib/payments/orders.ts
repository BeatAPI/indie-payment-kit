import { randomUUID } from 'node:crypto';
import { loadState, saveState, type Order, type OrderStatus } from './store';

export async function createOrder(input: {
  provider: string;
  amount?: number;
  currency?: string;
  customerId?: string | null;
  sku?: string | null;
}): Promise<Order> {
  const now = new Date().toISOString();
  const order: Order = {
    id: randomUUID(),
    provider: input.provider,
    providerRefs: [],
    amount: input.amount ?? 0,
    currency: input.currency ?? 'usd',
    status: 'pending',
    customerId: input.customerId ?? null,
    sku: input.sku ?? null,
    createdAt: now,
    updatedAt: now,
  };
  const state = await loadState();
  state.orders.push(order);
  await saveState(state);
  return order;
}

export async function attachProviderRef(orderId: string, providerRef: string): Promise<Order | null> {
  const state = await loadState();
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return null;
  if (!order.providerRefs.includes(providerRef)) order.providerRefs.push(providerRef);
  order.updatedAt = new Date().toISOString();
  await saveState(state);
  return order;
}

export async function findOrderById(orderId: string): Promise<Order | null> {
  const state = await loadState();
  return state.orders.find((item) => item.id === orderId) ?? null;
}

export async function findOrderByProviderRef(provider: string, providerRef: string): Promise<Order | null> {
  const state = await loadState();
  return state.orders.find((item) => item.provider === provider && item.providerRefs.includes(providerRef)) ?? null;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  extras: Partial<Pick<Order, 'amount' | 'currency' | 'customerId' | 'sku'>> = {},
): Promise<Order | null> {
  const state = await loadState();
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return null;
  order.status = status;
  Object.assign(order, extras);
  order.updatedAt = new Date().toISOString();
  await saveState(state);
  return order;
}
