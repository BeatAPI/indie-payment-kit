# Provider support levels

Provider support is capability-specific. Use these labels in documentation,
issues, and user-facing results.

| Level | Meaning |
|---|---|
| `cataloged` | Official sources and basic route metadata are maintained. |
| `selectable` | The deterministic recommender can rank the provider. |
| `official-handoff` | The Skill routes to current official Skill/plugin/MCP/docs. |
| `guided-integration` | Maintained framework-specific implementation guidance exists. |
| `sandbox-verified` | Maintainers executed the documented sandbox lifecycle and saved reproducible tests. |
| `production-reference` | A public reference implementation has verified production evidence without exposing sensitive data. |

Version `0.1.0` claims `selectable` and `official-handoff` for the eight catalog
providers, plus a shared provider-neutral conformance contract.

Do not infer `sandbox-verified` or `production-reference` from the existence of
an official provider Skill, generated code, a successful build, or a dashboard
configuration screen.
