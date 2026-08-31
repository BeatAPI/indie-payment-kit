import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type OrderStatus = 'created' | 'pending' | 'paid' | 'refunded' | 'canceled' | 'failed';

export type Order = {
  id: string;
  provider: string;
  providerRefs: string[];
  amount: number;
  currency: string;
  status: OrderStatus;
  customerId: string | null;
  sku: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Entitlement = {
  customerId: string;
  sku: string;
  active: boolean;
  sourceOrderId: string | null;
  updatedAt: string;
};

export type EventStatus = 'processing' | 'succeeded' | 'failed';

export type EventReceipt = {
  provider: string;
  eventId: string;
  status: EventStatus;
  attempts: number;
  error: string | null;
  updatedAt: string;
};

export type PaymentState = {
  orders: Order[];
  events: EventReceipt[];
  entitlements: Entitlement[];
};

// Sandbox scaffold only. Replace this file with the project's durable database adapter before
// production or multi-instance testing. The generated webhook state machine is intentionally kept
// behind loadState/saveState so an agent can replace this adapter without rewriting provider routes.
const stateFile = path.join(process.cwd(), '.indie-payment-kit', 'state.json');

export async function loadState(): Promise<PaymentState> {
  try {
    const parsed = JSON.parse(await readFile(stateFile, 'utf8')) as Partial<PaymentState>;
    return {
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      events: Array.isArray(parsed.events) ? parsed.events.filter((event) => typeof event !== 'string') : [],
      entitlements: Array.isArray(parsed.entitlements) ? parsed.entitlements : [],
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return { orders: [], events: [], entitlements: [] };
    }
    throw error;
  }
}

export async function saveState(state: PaymentState): Promise<void> {
  await mkdir(path.dirname(stateFile), { recursive: true });
  await writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`);
}
