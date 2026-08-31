# Indie Payment Kit

One Skill that takes a developer from an existing repository to a payment integration plan, code
changes, and sandbox evidence without handing the conversation to a second provider Skill.

```text
install once -> inspect the real project -> choose a provider -> load its official Skill internally
             -> extend the existing payment domain or add a framework-native adapter
             -> validate locally -> verify the sandbox flow -> report the evidence state
```

Built by [BeatAPI](https://beatapi.io) for developers using coding agents.

## v0.3 public beta

- Seven provider packs are discovered and installed from provider-maintained Agent Skills: Stripe,
  Dodo Payments, PayPal, Paddle, Polar, Alipay, and WeChat Pay.
- Creem is loaded from its official AI-agent Skill documentation until its published Skill exposes
  a standard Skills CLI entry point.
- Provider packs install in a temporary directory and are copied to
  `.indie-payment-kit/packs/`; existing user Skills are never removed.
- Existing payment modules, routes, SDKs, data layers, and environment-key names are detected before
  any write plan is created.
- Mature projects use `extend-existing`; the kit does not generate a second payment domain.
- New Next.js App Router projects can materialize a one-time-payment sandbox starter for Stripe or
  Dodo. Subscriptions and other frameworks use agent-guided implementation from the selected
  official provider pack.

This beta does **not** claim that any provider is `sandbox-verified` or production-ready by default.
Generated files and successful builds are lower evidence states than a completed sandbox payment.

## Install

```bash
npx skills add https://github.com/BeatAPI/indie-payment-kit
```

Then ask one question, for example:

- “Use Indie Payment Kit to add Stripe credit-pack payments to this TanStack project.”
- “Connect this Next.js app to Dodo Payments and verify the sandbox webhook.”
- “Choose a global and mainland-China payment route for this SaaS.”
- “Review the existing payment module and migrate it without creating a second billing system.”

## Current execution modes

| Project target | Current behavior |
|---|---|
| Existing payment implementation | Inspect and extend the existing domain with the selected official provider Skill |
| Next.js App Router, new project | Stripe/Dodo one-time sandbox starter; other flows are agent-guided |
| Next.js Pages Router | Agent-guided adaptation into the detected `pages` or `src/pages` tree |
| TanStack Start | Agent-guided native routes using the official provider pack and existing project conventions |
| Hono / Express / Fastify / Node | Agent-guided adapter inside the existing server/router structure |
| HTML or SPA with an API | Frontend checkout entry plus agent-guided server integration |
| Static HTML only | Hosted Payment Link; no automated entitlement without a trusted server |

“Agent-guided” still means the root Skill owns the task and writes the project changes. It means the
implementation is derived from the current official provider Skill rather than a maintained canned
template.

## Provider source policy

Indie Payment Kit does not invent provider APIs. Every route starts from an allowlisted,
provider-maintained Skill, toolkit, or official AI-agent source recorded in
`provider-packs.json`. The selected material is loaded internally and remains subject to the
project's architecture, authorization, secret, and production-mutation rules.

Seven current official sources and their selected entry Skill names were checked on 2026-08-31.
Installer isolation, integrity matching, and selective copying are covered by local tests; this is
not a claim that every upstream download was re-executed for this release. Creem remains a manual
official-Skill source because its current repository is not discoverable through the standard
Skills CLI.

## Deterministic tools

Inspect without reading secret values:

```bash
npm run inspect -- /path/to/project
```

Recommend a route and build a framework-aware plan:

```bash
npm run recommend -- \
  --market global \
  --entity individual \
  --product saas \
  --billing subscription \
  --tax managed \
  --stack tanstack

npm run plan -- \
  --project /path/to/project \
  --provider dodo \
  --billing subscription
```

Inspect a provider pack before the approved download:

```bash
npm run provider-pack -- --provider stripe --billing one-time
```

Materialization is intentionally narrow:

```bash
npm run materialize -- \
  --project /path/to/new-nextjs-project \
  --provider stripe \
  --billing one-time
```

It writes only new Next.js App Router Stripe/Dodo one-time sandbox starters. Existing payment
domains, subscriptions, TanStack, Hono, Node, and other providers stay in the official-pack-driven
agent path.

## Safety and evidence boundary

- No default telemetry or credential collection.
- No `.env` value reads and no browser-side secret keys.
- External pack downloads and repository writes require an explicit plan confirmation.
- Product and price identifiers are selected on the trusted server in checked-in starters.
- The included JSON store is a local sandbox seam, not a production or multi-instance database.
- Generated checkout routes require `INDIE_PAYMENT_KIT_ENABLE_SANDBOX_CHECKOUT=true` locally and
  remain disabled when `NODE_ENV=production`; production integrations must add project-native
  authentication and rate limiting.
- Live products, webhooks, refunds, subscriptions, and other account mutations require fresh
  confirmation.
- Merchant approval, sandbox payment success, and production collection are never inferred from
  generated code.

## Verify

```bash
npm run verify
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  skills/indie-payment-kit
python3 ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py .
```

See [the PRD](docs/PRD.md), [architecture](docs/ARCHITECTURE.md), and
[contribution guide](CONTRIBUTING.md). Licensed under MIT.
