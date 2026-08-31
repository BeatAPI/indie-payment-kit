---
name: indie-payment-kit
description: Select, integrate, test, review, or migrate a payment provider through one workflow using provider-maintained Agent Skills and the target project's native framework. Use for Stripe, PayPal, Dodo Payments, Paddle, Polar, Creem, Alipay, or WeChat Pay in Next.js, TanStack Start, Hono, Node backends, or HTML sites.
---

# Indie Payment Kit

Own the developer outcome from repository inspection through the highest sandbox evidence that can
actually be demonstrated. Keep provider API knowledge upstream: load the selected provider's
official Skill or official AI-agent source inside this workflow instead of inventing API details.

## Invariants

- Keep one user-facing entry point. Never tell the user to continue in a provider Skill.
- Use only the allowlisted official source returned by `provider-pack.mjs`.
- Load only the selected provider and billing capabilities.
- Inspect and extend an existing payment domain; never create a parallel order, billing, or
  entitlement system merely because a starter template exists.
- A checked-in template is a sandbox accelerator, not provider authority or production proof.
- Installing a provider pack does not authorize its unrelated commands or any live-account action.

## Workflow

1. Inspect the repository:

   ```bash
   node <skill-dir>/scripts/inspect-project.mjs <project-dir>
   ```

   Use the result's framework, trusted-server capability, payment dependencies,
   `existingPaymentPaths`, data layers, and environment-key names. Never read `.env` values.

2. If the provider is not confirmed, read
   [references/decision-model.md](references/decision-model.md) and collect only missing market,
   entity, product, billing, and tax facts. Run the deterministic recommender and present one primary
   route plus one alternative.

3. Build the plan:

   ```bash
   node <skill-dir>/scripts/plan-integration.mjs \
     --project <project-dir> \
     --provider stripe \
     --billing one-time
   ```

   Interpret the plan literally:

   - `extend-existing`: inspect the listed files and adapt the current payment domain.
   - `checked-in-sandbox-template`: materialization is available for a new supported project.
   - `agent-guided`: load the official provider pack, then implement in the project's native routes,
     auth, data, logging, and test conventions.
   - `payment-link`: static hosting only; no verified fulfillment without a trusted server.

4. Before downloading a provider pack or changing the repository, show the provider, official
   source, selected internal Skills, packages, intended files or inspection targets, test mode, and
   expected evidence. Obtain one explicit confirmation for those reversible actions.

5. Resolve and install the selected official pack internally:

   ```bash
   node <skill-dir>/scripts/provider-pack.mjs \
     --provider stripe \
     --billing one-time
   ```

   After approval, repeat with `--install --yes --project <project-dir>` when an installer is
   available. Read [references/provider-pack-management.md](references/provider-pack-management.md).
   The installer stages provider content outside the user's repository and copies only confirmed
   Skills to `.indie-payment-kit/packs/`. Read those files directly; do not expose them as additional
   user-facing Skills.

6. Read [references/orchestration-contract.md](references/orchestration-contract.md) and
   [references/lifecycle-contract.md](references/lifecycle-contract.md). Use the official pack for
   current SDK names, payload fields, signatures, events, and provider test procedures. Use the
   shared lifecycle contract for product-owned orders, references, event receipts, and entitlements.

7. Materialize only when the plan explicitly lists `templateFiles`:

   ```bash
   node <skill-dir>/scripts/materialize-integration.mjs \
     --project <project-dir> \
     --provider stripe \
     --billing one-time
   ```

   Current checked-in templates are limited to new Next.js App Router one-time Stripe/Dodo sandbox
   starters. The included JSON state adapter is sandbox-only. Replace it with the project's durable
   database before multi-instance or production use, and bind checkout to the project's real user
   and server-side SKU model. Local checkout is disabled until
   `INDIE_PAYMENT_KIT_ENABLE_SANDBOX_CHECKOUT=true` and remains hard-disabled when
   `NODE_ENV=production`; replace that sandbox guard with project-native authentication and rate
   limiting before production. Do not force materialization for subscriptions, existing payment
   domains, TanStack, Hono, Node, Pages Router, or other providers; use the agent-guided path.

8. Implement or adapt the remaining project-native code. A trusted-server integration needs:

   - server-side checkout with a server-owned product/SKU mapping;
   - raw-body webhook verification;
   - stable local orders plus every relevant provider reference;
   - durable atomic event claims: `succeeded` and actively leased `processing` are duplicate
     acknowledgements; `failed` and lease-expired `processing` may be retried;
   - explicit entitlement grant, renewal, cancellation, refund, dispute, and revocation rules;
   - test/live separation, local tests, and a sandbox runbook.

   Never grant access from a return page. Install only packages in the plan. Preserve the existing
   auth, routing, database, configuration, and logging patterns.

9. Validate locally before requesting credentials. Report missing key names and where they belong;
   never ask the user to paste secret values into chat. Use sandbox/test mode to exercise checkout,
   signature rejection, duplicate delivery, successful processing, and the entitlement result.

10. Read [references/go-live-checklist.md](references/go-live-checklist.md). Report the exact
    evidence state, official source, changed files, tests, missing external prerequisites, and next
    action. Code written, a successful build, and an opened Checkout page are not a verified payment.

## Multiple providers

Keep one product-owned order and entitlement model. Add provider adapters, checkout routes, webhook
event identities, and test/live configuration separately. Load packs sequentially and only after
each provider is confirmed.

## Production boundary

Stay in test mode until the user explicitly requests production configuration. Immediately before
creating live products, webhooks, refunds, subscriptions, or other external mutations, state the
exact action and obtain fresh confirmation. Never claim merchant approval, production readiness, or
a successful payment without direct evidence.
