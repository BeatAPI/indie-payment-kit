import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { attachProviderRef, createOrder } from '@/lib/payments/orders';

export const runtime = 'nodejs';

export async function POST() {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.INDIE_PAYMENT_KIT_ENABLE_SANDBOX_CHECKOUT !== 'true'
  ) {
    return NextResponse.json(
      { error: 'Sandbox checkout is disabled. Add project authentication and rate limiting before production.' },
      { status: 503 },
    );
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!secret || !appUrl) {
    return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY or APP_URL' }, { status: 500 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: 'Missing priceId' }, { status: 400 });
  }

  const mode = '__STRIPE_CHECKOUT_MODE__';
  const order = await createOrder({
    provider: 'stripe',
    sku: priceId,
  });

  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/payment/success?order=${order.id}`,
    cancel_url: `${appUrl}/payment/success?order=${order.id}&canceled=1`,
    client_reference_id: order.id,
    metadata: { orderId: order.id, sku: priceId },
  });

  if (!session.id || !session.url) {
    return NextResponse.json({ error: 'Stripe checkout session was not created' }, { status: 502 });
  }

  await attachProviderRef(order.id, session.id);
  return NextResponse.json({ url: session.url, orderId: order.id });
}
