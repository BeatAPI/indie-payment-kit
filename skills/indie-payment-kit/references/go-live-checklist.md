# Payment go-live checklist

Report every item as `pass`, `fail`, `not tested`, or `not applicable`. A code path, dependency
installation, checkout page, or dashboard screenshot is not proof that a payment completed.

## Account and product

- Merchant identity and product category are approved for the selected route.
- Settlement account, payout currency, reserve, refund, and dispute rules are
  understood.
- Live product and price identifiers match the deployed environment.
- Return, refund, privacy, and terms pages required by the provider exist.

## Secrets and permissions

- No secrets are committed, logged, returned to browsers, or pasted into chat.
- Live and test credentials are separate.
- API keys use the narrowest practical permissions.
- Key rotation and incident-response ownership are documented.

## Checkout and money

- Amount, currency, quantity, tax, discount, and customer ownership are
  validated server-side.
- A stable local order is created before redirecting to checkout.
- Client-supplied price ids or amounts cannot grant unintended access.
- Success and cancel redirects are safe and do not leak secrets.

## Webhooks and idempotency

- Signature verification uses the provider's official method and raw body.
- Duplicate delivery is tested.
- Out-of-order delivery is tested or reconciled.
- Processing returns the provider-required status and remains retry-safe.
- Failed event processing is visible and replayable.

## Entitlements and lifecycle

- Payment success grants the correct access exactly once.
- Renewal extends access exactly once.
- Failed renewal, cancellation, expiration, refund, partial refund, and dispute
  behaviors are defined and tested.
- Customer portal actions synchronize back into the product.
- A reconciliation job or operator workflow can repair missed events.

## Evidence levels

Use the highest level actually demonstrated:

1. `inspected`
2. `provider-confirmed`
3. `provider-pack-ready`
4. `code-written`
5. `local-validation-passed`
6. `sandbox-configured`
7. `sandbox-checkout-opened`
8. `sandbox-payment-verified`
9. `sandbox-lifecycle-verified`
10. `production-configured`
11. `production-payment-verified`

Never collapse these levels into a generic “integrated” status.
