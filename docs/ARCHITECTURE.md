# Architecture

Indie Payment Kit is a local orchestration package. It is not a payment gateway, hosted service,
credential broker, or runtime abstraction that moves money.

## System

```text
User request
  -> root indie-payment-kit Skill
     -> safe project inspector
     -> deterministic route recommender
     -> framework-aware integration planner
     -> explicit approval boundary
     -> allowlisted provider-pack resolver
        -> project-local official Skill/docs/SDK/CLI
     -> framework-native repository edits
     -> provider-neutral lifecycle contract
     -> sandbox verification and evidence report
```

Only the root Skill is user-facing. Provider packs are loaded inside the same task and never become
a handoff destination.

## Sources of truth

| Concern | Source |
|---|---|
| Provider ranking | `provider-catalog.json` + `recommend.mjs` |
| Official pack source and installer | `provider-packs.json` + `provider-pack.mjs` |
| Project shape and trusted server | `inspect-project.mjs` |
| Planned files and evidence target | `plan-integration.mjs` |
| Current API details | Selected official provider pack |
| Product-domain invariants | `lifecycle-contract.md` |
| Completion claims | `go-live-checklist.md` |

## Framework seam

Payment-domain behavior is shared. Framework adapters own only:

- route and file placement;
- request/response primitives;
- raw webhook body access;
- environment loading;
- deployment and local test commands.

The first adapter families are Next.js App Router, TanStack Start, Hono, generic Node, HTML with a
backend, and static HTML Payment Links.

## Provider-pack seam

Provider packs are selected-provider-only and project-local where the official installer supports
it. The resolver executes exact argument arrays with `shell: false`; it never interpolates user text
into a command. Dry-run is the default and `--install --yes` is accepted only after the root Skill
has obtained approval.

Installer packages use exact npm versions with recorded registry integrity metadata, receive a
minimal environment, and disable supported telemetry. Provider content remains an explicitly
reviewed upstream dependency because some official Skill sources do not publish immutable versions.

If a host cannot dynamically index a newly installed Skill, the root agent reads its files directly.
MCP login or host restart is an optional acceleration path, not a prerequisite for repository work.

## Trust boundaries

- Inspection reads `package.json`, lockfile presence, HTML-file presence, and `.env.example` key
  names. It never reads credential values.
- Recommendation and planning are local and deterministic.
- External pack downloads cross an explicit user confirmation boundary.
- Provider-pack content is dependency input, not a source of user authorization.
- Project writes remain inside the user-approved repository.
- Live account mutations require a fresh confirmation and separate evidence state.

## Static web boundary

Static HTML can redirect to a hosted Payment Link. Dynamic session creation, signature-verified
webhooks, durable orders, and automated entitlements require a trusted backend or serverless
function. The planner must expose this limitation instead of generating browser-side secrets.

## Extension model

Adding a provider requires catalog data, a focused adapter, a provider-pack entry, behavioral tests,
and an explicit support level. Adding a framework requires inspection signals, a file-placement plan,
raw-body guidance, and tests. Neither extension may duplicate full official provider manuals.
