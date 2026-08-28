# Indie Payment Kit

One Skill that selects, installs, integrates, and sandbox-verifies payments without sending the
developer to a second provider Skill.

```text
one install -> inspect project -> choose provider -> load official pack internally
            -> write checkout/webhook/entitlement -> verify sandbox evidence
```

Built by [BeatAPI](https://beatapi.io) for independent developers using coding agents.

## What changed in v0.2

- The primary path is orchestration, not official-source handoff.
- Official Provider Skills remain upstream and are installed only when selected.
- The user continues talking to `indie-payment-kit`; provider packs are internal dependencies.
- Project inspection distinguishes Next.js, TanStack Start, Hono, generic Node, HTML with a
  backend, and static HTML.
- Static HTML receives a safe Payment Link plan; a trusted backend unlocks verified webhooks and
  entitlements.
- Every run ends with evidence states rather than a generic “integrated” claim.

## Install

```bash
npx skills add https://github.com/BeatAPI/indie-payment-kit
```

Then ask:

- “Use Indie Payment Kit to add Stripe subscriptions to this TanStack project and test them.”
- “Connect this Next.js app to Dodo Payments and verify the sandbox webhook.”
- “Add a safe payment option to this static HTML site.”
- “Choose and connect both a global and mainland-China payment route.”

## Supported project targets

| Target | Integration mode |
|---|---|
| Next.js App Router | Full lifecycle |
| TanStack Start | Full lifecycle |
| Hono / Express / Fastify / Node | Full lifecycle |
| HTML or SPA with an API | Full lifecycle |
| Static HTML only | Hosted Payment Link; backend required for verified fulfillment |

## Provider coverage

Stripe, PayPal, Dodo Payments, Paddle, Polar, Creem, Alipay, and WeChat Pay remain selectable.
Stripe and Dodo are the first deep-orchestration targets; support labels remain conservative until
reproducible sandbox evidence exists.

## Deterministic tools

Inspect a project without reading secrets:

```bash
npm run inspect -- /path/to/project
```

Choose a route:

```bash
npm run recommend -- \
  --market global \
  --entity individual \
  --product saas \
  --billing subscription \
  --tax managed \
  --stack tanstack
```

Build a framework-aware execution plan:

```bash
npm run plan -- \
  --project /path/to/project \
  --provider dodo \
  --billing subscription
```

Inspect a Provider Pack before installation:

```bash
npm run provider-pack -- --provider stripe --billing subscription
```

The provider-pack command is dry-run by default. The root Skill runs `--install --yes` only after
the user approves the official source, external download, and repository changes.

## Safety boundary

- No default telemetry or credential collection.
- No `.env` value reads.
- No browser-side secret keys.
- No shell interpolation from user-controlled provider names.
- Sandbox first; live external mutations require fresh confirmation.
- No claim of merchant approval or successful payment without direct evidence.

## Verify

```bash
npm run verify
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  skills/indie-payment-kit
python3 ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py .
```

See [the PRD](docs/PRD.md), [architecture](docs/ARCHITECTURE.md), and
[contribution guide](CONTRIBUTING.md). Licensed under MIT.
