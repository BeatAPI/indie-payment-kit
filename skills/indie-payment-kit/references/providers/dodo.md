# Dodo Payments adapter

Use Dodo Payments for global SaaS, APIs, and digital products when a Merchant
of Record route, subscriptions, usage, credits, licenses, or localized pricing
fit the seller.

## Internal official provider pack

- Official Skills: https://github.com/dodopayments/skills
- Official agent plugin: https://github.com/dodopayments/dodo-agent-plugin
- Documentation: https://docs.dodopayments.com/
- Universal Skills install: `npx skills add dodopayments/skills`

The official package already covers framework adapters, checkout, webhooks,
subscriptions, usage-based and credit-based billing, license keys, testing,
and Better Auth. Load only the relevant official Skill inside the root workflow.

## Confirm before implementation

- seller and product eligibility for MoR onboarding;
- payout country, currency, timing, reserves, and refund/dispute rules;
- billing model and product catalog ownership;
- whether licenses or credits are provider-managed or product-managed;
- migration of existing customers and subscriptions.

MoR does not remove the need for local order, entitlement, idempotency, and
reconciliation logic.
