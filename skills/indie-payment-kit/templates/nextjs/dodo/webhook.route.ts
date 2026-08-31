import { NextResponse } from 'next/server';
import { Webhook } from 'standardwebhooks';
import { grantEntitlement, revokeEntitlement } from '@/lib/payments/entitlements';
import { beginEvent, completeEvent, failEvent } from '@/lib/payments/events';
import { attachProviderRef, findOrderById, findOrderByProviderRef, updateOrderStatus } from '@/lib/payments/orders';

export const runtime = 'nodejs';

type DodoEvent = {
  type?: string;
  data?: {
    payment_id?: string;
    subscription_id?: string;
    customer_id?: string;
    metadata?: { orderId?: string; sku?: string };
    total_amount?: number;
    currency?: string;
  };
};

export async function POST(request: Request) {
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!webhookKey) {
    return NextResponse.json({ error: 'Missing DODO_PAYMENTS_WEBHOOK_KEY' }, { status: 500 });
  }

  const raw = await request.text();
  const webhook = new Webhook(webhookKey);
  try {
    webhook.verify(raw, {
      'webhook-id': request.headers.get('webhook-id') ?? '',
      'webhook-signature': request.headers.get('webhook-signature') ?? '',
      'webhook-timestamp': request.headers.get('webhook-timestamp') ?? '',
    });
  } catch {
    return NextResponse.json({ error: 'Invalid Dodo webhook signature' }, { status: 400 });
  }

  const event = JSON.parse(raw) as DodoEvent;
  const eventId = request.headers.get('webhook-id') ?? raw;
  if (!(await beginEvent('dodo', eventId))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const payload = event.data ?? {};
    const orderId = payload.metadata?.orderId;
    const sku = payload.metadata?.sku ?? 'default';
    const order = orderId
      ? await findOrderById(orderId)
      : await findOrderByProviderRef('dodo', payload.payment_id ?? payload.subscription_id ?? '');
    const customerId = payload.customer_id ?? order?.id ?? 'unknown';

    if (event.type === 'payment.succeeded' && order) {
      if (payload.payment_id) await attachProviderRef(order.id, payload.payment_id);
      await updateOrderStatus(order.id, 'paid', {
        amount: payload.total_amount ?? order.amount,
        currency: payload.currency ?? order.currency,
        customerId,
        sku,
      });
      await grantEntitlement(customerId, sku, order.id);
    }

    if ((event.type === 'refund.succeeded' || event.type === 'dispute.opened') && order?.customerId) {
      await updateOrderStatus(order.id, 'refunded');
      await revokeEntitlement(order.customerId, order.sku ?? sku);
    }

    if ((event.type === 'payment.failed' || event.type === 'payment.cancelled') && order) {
      await updateOrderStatus(order.id, event.type === 'payment.failed' ? 'failed' : 'canceled');
    }

    await completeEvent('dodo', eventId);
    return NextResponse.json({ received: true });
  } catch (error) {
    await failEvent('dodo', eventId, error);
    return NextResponse.json({ error: 'Dodo event processing failed' }, { status: 500 });
  }
}
