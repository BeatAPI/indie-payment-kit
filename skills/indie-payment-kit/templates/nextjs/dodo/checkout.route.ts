import { NextResponse } from 'next/server';
import DodoPayments from 'dodopayments';
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

  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.DODO_PAYMENTS_RETURN_URL;
  const productId = process.env.DODO_PAYMENTS_PRODUCT_ID;
  if (!apiKey || !appUrl || !productId) {
    return NextResponse.json({ error: 'Missing Dodo API key, APP_URL, or productId' }, { status: 500 });
  }

  const order = await createOrder({
    provider: 'dodo',
    sku: String(productId),
  });

  const client = new DodoPayments({
    bearerToken: apiKey,
    environment: process.env.DODO_PAYMENTS_ENVIRONMENT === 'live' ? 'live_mode' : 'test_mode',
  });

  const session = await client.checkoutSessions.create({
    product_cart: [{ product_id: String(productId), quantity: 1 }],
    return_url: `${appUrl}/payment/success?order=${order.id}`,
    metadata: { orderId: order.id, sku: String(productId) },
  });

  await attachProviderRef(order.id, session.session_id ?? session.id);
  return NextResponse.json({
    url: session.checkout_url ?? session.url,
    orderId: order.id,
  });
}
