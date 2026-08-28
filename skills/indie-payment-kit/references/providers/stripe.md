# Stripe adapter

Use Stripe when the seller wants direct global processing, supports its own tax
and compliance operations, or needs flexible marketplace/platform primitives.

## Official handoff

- Official AI repository: https://github.com/stripe/ai
- Documentation: https://docs.stripe.com/
- Universal Skills install: `npx skills add https://docs.stripe.com`
- Codex plugin: `codex plugin add stripe@openai-curated`

Prefer the current official Stripe Skill/plugin for SDK calls, Checkout,
Billing, Connect, webhook signatures, and account operations.

## Confirm before implementation

- seller country, legal entity, and account capability availability;
- direct payments versus Connect/platform money movement;
- one-time, subscription, usage, or credits model;
- Stripe Tax responsibility and invoice requirements;
- Checkout versus embedded/custom UI.

## Shared gates

Use Checkout or PaymentIntent identifiers only as provider references. Keep a
local order, verify webhook signatures from raw bytes, deduplicate event and
transaction ids, and reconcile refunds, disputes, subscription changes, and
entitlements. Do not grant access from `success_url`.
