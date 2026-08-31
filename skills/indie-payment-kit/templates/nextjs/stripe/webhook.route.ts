import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { grantEntitlement, revokeEntitlement } from '@/lib/payments/entitlements';
import { beginEvent, completeEvent, failEvent } from '@/lib/payments/events';
import { attachProviderRef, findOrderById, findOrderByProviderRef, updateOrderStatus } from '@/lib/payments/orders';

export const runtime = 'nodejs';

function customerIdFrom(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.length > 0) return value;
  return fallback;
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!secret || !webhookSecret || !signature) {
    return NextResponse.json({ error: 'Missing Stripe webhook configuration' }, { status: 500 });
  }

  const raw = await request.text();
  const stripe = new Stripe(secret);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid Stripe signature' }, { status: 400 });
  }

  if (!(await beginEvent('stripe', event.id))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.client_reference_id ?? session.metadata?.orderId;
      const order = orderId
        ? await findOrderById(orderId)
        : await findOrderByProviderRef('stripe', session.id);
      if (order && session.payment_status === 'paid') {
        if (typeof session.payment_intent === 'string') {
          await attachProviderRef(order.id, session.payment_intent);
        }
        const sku = session.metadata?.sku ?? order.sku ?? 'default';
        const customerId = customerIdFrom(session.customer ?? session.customer_email, order.id);
        await updateOrderStatus(order.id, 'paid', {
          amount: session.amount_total ?? order.amount,
          currency: session.currency ?? order.currency,
          customerId,
          sku,
        });
        await grantEntitlement(customerId, sku, order.id);
      }
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.client_reference_id ?? session.metadata?.orderId;
      if (orderId) await updateOrderStatus(orderId, 'failed');
    }

    if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
      const charge = event.data.object as Stripe.Charge;
      const order = await findOrderByProviderRef('stripe', String(charge.payment_intent ?? ''));
      if (order?.customerId && order.sku) {
        await updateOrderStatus(order.id, 'refunded');
        await revokeEntitlement(order.customerId, order.sku);
      }
    }

    await completeEvent('stripe', event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    await failEvent('stripe', event.id, error);
    return NextResponse.json({ error: 'Stripe event processing failed' }, { status: 500 });
  }
}
