---
name: indie-payment-kit
description: Choose, compare, integrate, migrate, or review payment providers for an indie SaaS, API, or digital product. Use when the user wants one workflow across Stripe, PayPal, Dodo Payments, Paddle, Polar, Creem, Alipay, and WeChat Pay, or needs a provider-neutral payment launch check. Do not use it to move money or mutate live payment accounts without explicit authorization.
---

# Indie Payment Kit

Reduce payment-provider research and setup to one entry point. Recommend the
right route, load only the selected provider guidance, prefer current official
provider skills and documentation, and verify the integration against one
shared lifecycle contract.

## Choose the operating mode

- **Select**: compare providers for a new product.
- **Integrate**: implement the confirmed provider in an existing project.
- **Review**: inspect an existing integration and report launch blockers.
- **Migrate**: plan or execute a provider migration without breaking active
  customers or entitlements.

## Selection workflow

1. Infer the project stack and existing payment dependencies from the repo.
   Run `node <skill-dir>/scripts/inspect-project.mjs <project-dir>` when a
   machine-readable scan is useful.
2. Collect only missing decision inputs: target market, legal-entity shape,
   product type, billing model, tax preference, and stack. Read
   [references/decision-model.md](references/decision-model.md) for definitions.
3. Run the deterministic recommender:

   ```bash
   node <skill-dir>/scripts/recommend.mjs \
     --market global \
     --entity individual \
     --product saas \
     --billing subscription \
     --tax managed \
     --stack nextjs
   ```

4. Present one primary recommendation and one alternative. Separate verified
   facts from eligibility assumptions. Never imply that a recommendation
   guarantees merchant approval, supported countries, or legal compliance.
5. Get confirmation before installing provider packages, configuring external
   accounts, or changing the project.

For a dual-market result, treat the global and mainland-China rails as two
coordinated integrations. Do not pretend one provider automatically satisfies
both routes.

## Integration and review workflow

After the user confirms a provider:

1. Read only that provider's file under `references/providers/`.
2. Use the provider's current official Skill, plugin, MCP, SDK, and docs when
   available. The adapter is a routing layer, not a copied provider manual.
3. Read [references/lifecycle-contract.md](references/lifecycle-contract.md)
   before implementing or reviewing business logic.
4. Keep provider SDK calls behind a narrow adapter. Keep orders,
   subscriptions, and entitlements in the product's own domain model.
5. Treat verified webhooks or server-side status retrieval as payment truth;
   never grant access from a browser success redirect alone.
6. Require signature verification, idempotency, atomic entitlement changes,
   refund/cancellation revocation, environment separation, and replayable
   observability.
7. Read [references/go-live-checklist.md](references/go-live-checklist.md) and
   report each gate as pass, fail, not tested, or not applicable.

## Safety and truthfulness

- Never ask the user to paste secrets into chat or commit credentials.
- Never install all eight provider packages or load all provider references by
  default. Select first, then load one route.
- Require explicit authorization immediately before creating live products,
  webhooks, refunds, subscriptions, or other external mutations.
- Use sandbox/test mode until the user explicitly requests live configuration.
- Distinguish code written, sandbox configured, sandbox payment verified,
  production configured, and production payment verified.
- Do not recommend unlicensed payment aggregation or qualification-bypass
  services.

## Support claims

Read [references/support-levels.md](references/support-levels.md) before
describing provider coverage. This release provides deterministic selection,
official-source handoff, and provider-neutral conformance guidance for eight
providers. It does not claim eight production integrations have been executed
or certified by their providers.
