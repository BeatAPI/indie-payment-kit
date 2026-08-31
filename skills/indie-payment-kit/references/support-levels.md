# Provider support levels

Provider support is capability-specific. Use these labels in documentation,
issues, and user-facing results.

| Level | Meaning |
|---|---|
| `cataloged` | Official sources and basic route metadata are maintained. |
| `selectable` | The deterministic recommender can rank the provider. |
| `managed-provider-source` | The root workflow loads current official Skill/plugin/SDK/docs internally without a second user entry point. |
| `orchestrated-preview` | Framework-aware planning and internal provider-pack loading exist, but reproducible sandbox lifecycle evidence is not yet maintained. |
| `guided-integration` | Maintained framework-specific implementation guidance and tests exist. |
| `sandbox-verified` | Maintainers executed the documented sandbox lifecycle and saved reproducible tests. |
| `production-reference` | A public reference implementation has verified production evidence without exposing sensitive data. |

Version `0.3` claims `selectable` for all eight catalog providers. Stripe, Dodo, PayPal, Paddle,
Polar, Alipay, and WeChat Pay have checked official source and entry-Skill metadata plus locally
tested installer isolation and selective-copy behavior. This does not claim that every upstream
download was re-executed for the release. Creem has a provider-maintained AI-agent Skill source that
is read manually because it is not currently exposed through standard Skills CLI discovery.

Stripe and Dodo additionally claim `orchestrated-preview` for new Next.js App Router one-time
payment sandbox starters. Subscriptions, existing payment domains, TanStack, Hono, Node, Pages
Router, and every other provider use the official-pack-driven `agent-guided` execution mode. No
provider claims `sandbox-verified` yet.

Do not infer `sandbox-verified` or `production-reference` from the existence of
an official provider Skill, generated code, a successful build, a checkout page opening, or a
dashboard configuration screen.
