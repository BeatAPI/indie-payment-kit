---
name: indie-payment-kit
description: Select, install, implement, test, review, or migrate payment providers for an indie SaaS, API, app, or website through one user-facing workflow. Use for Stripe, PayPal, Dodo Payments, Paddle, Polar, Creem, Alipay, or WeChat Pay across Next.js, TanStack Start, Hono, Node backends, and HTML sites. The user should not need to invoke a provider Skill separately.
---

# Indie Payment Kit

Own the payment outcome from project inspection through sandbox evidence. Official provider
Skills, SDKs, CLIs, MCP servers, and documentation are internal dependencies of this workflow,
not additional user-facing entry points.

## Single-entry invariant

- Keep the conversation inside `indie-payment-kit`.
- Never finish by telling the user to invoke, open, or continue in a provider Skill.
- Load only the confirmed provider pack and only the capabilities needed for this integration.
- Provider-pack instructions supply current API details; this Skill owns project structure,
  multi-provider coordination, lifecycle invariants, verification, and status truth.
- Installing a provider pack never grants permission to run its unrelated commands or mutate a
  live account.

## Execute the workflow

1. Inspect the target repository:

   ```bash
   node <skill-dir>/scripts/inspect-project.mjs <project-dir>
   ```

   Detect the framework, trusted-server capability, package manager, existing payment signals,
   and environment-variable names. Do not read `.env` values.

2. If the provider is not already selected, collect only missing market, entity, product,
   billing, tax, and stack facts. Read
   [references/decision-model.md](references/decision-model.md), then use the deterministic
   recommender. Present one primary route and one alternative, but continue the same workflow.

3. Build the execution plan after provider confirmation:

   ```bash
   node <skill-dir>/scripts/plan-integration.mjs \
     --project <project-dir> \
     --provider stripe \
     --billing subscription
   ```

   Read [references/framework-matrix.md](references/framework-matrix.md) when the detected target
   is not obvious. Pure static HTML gets a Payment Link flow unless the user approves adding a
   backend or serverless function.

4. Before downloading an external provider pack or changing the project, summarize the selected
   provider, official source, packages, files, test environment, and expected evidence. Obtain one
   explicit confirmation covering those reversible actions.

5. Resolve and install the official provider pack internally:

   ```bash
   node <skill-dir>/scripts/provider-pack.mjs \
     --provider stripe \
     --billing subscription
   ```

   After approval, repeat with `--install --yes --project <project-dir>` when an allowlisted
   installer exists. Read [references/provider-pack-management.md](references/provider-pack-management.md).
   Then run the resolver with `--locate` to obtain exact installed `SKILL.md` paths. If the host
   does not refresh its Skill index, read those project-local files directly. Do not send the user
   to a new conversation.

6. Read [references/orchestration-contract.md](references/orchestration-contract.md) and
   [references/lifecycle-contract.md](references/lifecycle-contract.md). Use current official
   provider instructions to implement the planned files inside the user's repository:

   - server-side checkout or an explicitly limited static Payment Link;
   - verified webhook using the unmodified raw request body;
   - stable local order and provider references;
   - idempotent event claim and retry-safe processing;
   - entitlement grant, renewal, cancellation, refund, dispute, and revocation;
   - environment example keys without credential values;
   - framework-native tests and a sandbox runbook.

   Keep provider SDK calls behind a narrow adapter. Reuse the project's existing database, auth,
   server routing, logging, and test patterns. Do not create a second payment domain if one exists.

7. Run local validation before requesting credentials. Report missing key names and where the user
   should place them; never ask the user to paste secret values into chat. Continue automatically
   once the configured environment exposes the required keys.

8. Use sandbox or test mode. Exercise checkout, webhook verification, duplicate delivery, and the
   entitlement result. When provider credentials or merchant approval are unavailable, complete
   every local step and stop at the exact missing prerequisite.

9. Read [references/go-live-checklist.md](references/go-live-checklist.md). Report the highest
   evidence state actually demonstrated, changed files, tests run, missing prerequisites, and the
   next action. “Code written” is not “sandbox payment verified.”

## Multiple providers

When the user confirms multiple channels, keep one product-owned order and entitlement model and
add separate provider adapters, checkout routes, webhook endpoints, event identities, and test/live
configuration. Install and load each provider pack sequentially. Never install all providers just
because the project supports multiple routes.

## Production boundary

Use test mode until the user explicitly asks for production configuration. Immediately before
creating live products, webhooks, refunds, subscriptions, or other external mutations, state the
exact action and obtain confirmation. Never claim merchant approval, production readiness, or a
successful payment without direct evidence.
