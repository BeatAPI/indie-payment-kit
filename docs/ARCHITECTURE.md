# Architecture

Indie Payment Kit is a routing and conformance package, not a runtime payment
abstraction or hosted payment service.

## Layers

```text
User request
  -> indie-payment-kit/SKILL.md
     -> local project inspector
     -> deterministic provider recommender
     -> one selected provider adapter
        -> current official Skill/plugin/MCP/docs
     -> provider-neutral lifecycle contract
     -> go-live evidence report
```

## One install without one giant context

The plugin exposes one discoverable Skill. Provider adapters are references and
are loaded lazily only after selection. Official provider packages remain the
source of truth for provider-specific APIs.

This avoids four common failures:

- loading eight manuals into every payment request;
- copying documentation that immediately drifts;
- installing unnecessary SDKs and MCP servers;
- presenting every provider as equally verified.

## Sources of truth

| Concern | Source |
|---|---|
| Provider ranking inputs | `references/provider-catalog.json` |
| Deterministic ranking | `scripts/recommend.mjs` |
| Provider-specific APIs | linked official provider Skill/docs |
| Product-domain invariants | `references/lifecycle-contract.md` |
| Launch claims | `references/go-live-checklist.md` |
| Support maturity | `references/support-levels.md` |

Provider adapters must not duplicate full official manuals. Their job is to
explain when to hand off, which official source to use, which decisions must be
confirmed, and which shared gates remain the product's responsibility.

## Trust boundaries

- Local inspection reads project metadata and `.env.example` key names only.
  It never reads `.env` values.
- Recommendation is local and deterministic; v0.1 has no telemetry.
- Provider MCP authentication and account operations remain between the user,
  the agent host, and the selected provider.
- The Skill requires explicit authorization before live external mutations.
- Secrets are not accepted as prompt inputs or catalog data.

## Recommendation model

The recommender is intentionally simple and auditable. It scores:

- route-market match;
- legal-entity fit as a routing hint;
- product and billing capability;
- managed-tax versus self-managed preference;
- stack support;
- strong route signals such as marketplace, physical goods, or dual market.

It does not score live fees, approval probability, reserves, exchange rates, or
country availability because those values change and require current official
verification.

## Extension model

Adding a provider requires:

1. a catalog entry with official HTTPS sources and verification date;
2. a focused provider adapter;
3. recommendation tests for behavior changes;
4. an explicit support level;
5. no new live credential path in the root plugin.

Framework-specific implementation and sandbox fixtures can be added as
separate references or scripts after they have reproducible evidence.
