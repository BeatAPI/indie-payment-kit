# Indie Payment Kit

One Skill to choose, integrate, and verify the right payment stack.

Indie Payment Kit gives coding agents one entry point across eight common
payment providers. It scans the project, recommends the right route, hands off
to current official provider tooling, and applies one shared checkout,
webhook, entitlement, refund, subscription, and go-live contract.

## Why this exists

An indie developer should not need to install and study eight unrelated Skills
or MCP servers before deciding which payment provider fits their market,
entity, product, and billing model.

This project compresses that workflow:

```text
one install -> project scan -> provider recommendation -> official handoff
            -> lifecycle implementation -> launch evidence
```

It is not a payment gateway, Merchant of Record, legal advisor, or credential
broker. It does not move money.

## Supported selection routes

| Route | Providers |
|---|---|
| Global direct processing | Stripe, PayPal |
| Merchant of Record | Dodo Payments, Paddle, Polar, Creem |
| Mainland China | Alipay, WeChat Pay |

Version `0.1.0` supports deterministic selection, current official-source
handoff, and provider-neutral launch checks for all eight. Provider-specific
production automation will be promoted separately only after end-to-end
verification.

## Install

Install the Skill with the universal Skills CLI:

```bash
npx skills add https://github.com/BeatAPI/indie-payment-kit
```

Or clone the repository and point your agent at
`skills/indie-payment-kit/SKILL.md`.

Example requests:

- “Choose the right payment provider for this SaaS.”
- “I sell globally from China. Should I use Stripe, Dodo, or Paddle?”
- “Review this webhook and entitlement flow before launch.”
- “Plan a safe migration from Lemon Squeezy to another provider.”

## Run the deterministic recommender

```bash
npm run recommend -- \
  --market global \
  --entity individual \
  --product saas \
  --billing subscription \
  --tax managed \
  --stack nextjs
```

Machine-readable output:

```bash
npm run recommend -- --market china --entity china-business \
  --product digital-goods --billing one-time --tax self \
  --stack tanstack --format json
```

## Package layout

- `skills/indie-payment-kit/SKILL.md` — the single user-facing entry point.
- `skills/indie-payment-kit/references/providers/` — lazy-loaded provider
  adapters that point to official sources.
- `skills/indie-payment-kit/references/provider-catalog.json` — transparent
  decision data.
- `skills/indie-payment-kit/scripts/` — project inspection and deterministic
  recommendation helpers.
- `docs/PRD.md` — product requirements and developer-acquisition strategy.
- `docs/ARCHITECTURE.md` — packaging, routing, and trust boundaries.

## Verify

```bash
npm run verify
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  skills/indie-payment-kit
python3 ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py .
```

## Privacy and trust

- No telemetry is collected in this release.
- The local recommender does not send project or business data anywhere.
- Provider recommendations are derived from the committed catalog and rules.
- Commercial relationships must be disclosed before they can influence
  ordering or recommendations.
- Secrets must stay in environment variables, provider dashboards, secret
  managers, or operating-system credential stores.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Provider eligibility and capabilities
change frequently, so source every change from current official material and
update the verification date.

## License

MIT. Built by [BeatAPI](https://beatapi.io).
