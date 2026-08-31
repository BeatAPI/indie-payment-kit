# Provider-neutral payment lifecycle contract

Use this contract for implementation, migration, and review. Provider adapters
translate SDK objects and events into these product-domain outcomes.

## Core objects

- **Order**: the product's stable purchase intent and amount/currency snapshot.
- **Provider session**: the external checkout or payment identifier.
- **Payment transaction**: a captured, failed, canceled, or refunded transfer.
- **Subscription**: the product-side view of recurring billing state.
- **Entitlement**: access, credits, quota, license, or feature state owned by the
  product.
- **Provider event receipt**: immutable record of event id, type, verification,
  processing status, attempts, and result.

Provider payloads are evidence, not the product's primary domain model.

## Required operations

```text
create checkout
retrieve server-side status
verify and normalize webhook
claim event idempotently
record payment outcome
grant or revoke entitlement atomically
cancel or update subscription
record refund and dispute outcomes
reconcile local state with provider state
```

Optional features such as invoices, customer portals, coupons, usage meters,
licenses, and adaptive pricing belong behind capability checks.

## Invariants

1. A browser redirect never grants paid access by itself.
2. Raw request bytes are preserved until webhook signature verification ends.
3. One provider event or transaction cannot grant the same entitlement twice. Succeeded events and
   actively leased processing events are duplicate acknowledgements; failed or lease-expired
   processing may be retried through an atomic claim.
4. Recording payment success and granting the entitlement share an atomic or
   safely recoverable boundary.
5. Refunds, disputes, expirations, and cancellations have explicit entitlement
   reconciliation rules.
6. Unknown events are recorded and acknowledged safely; they are not silently
   treated as success.
7. Test and live identifiers, keys, products, prices, and webhooks never mix.
8. Money uses integer minor units or exact decimal handling; floating-point
   arithmetic cannot determine charged totals.
9. Every failure can be retried or reconciled without duplicate money or
   duplicate access.
10. Provider-specific state remains traceable through stable local references.

## Event outcomes

Normalize provider events into product outcomes rather than forcing every
provider into identical event names:

- checkout completed;
- payment succeeded or failed;
- payment refunded, partially refunded, or disputed;
- subscription activated, renewed, changed, paused, canceled, or expired;
- entitlement granted, adjusted, suspended, or revoked.

Store the original event alongside normalized fields for audit and replay.

## Migration rule

Never overwrite the old provider identity. During migration, preserve:

- old and new customer ids;
- old and new subscription ids;
- migration cohort and cutover time;
- source of truth for each active billing period;
- rollback and customer-communication plan.

Run providers in parallel only when ownership of renewals and entitlements is
unambiguous.
