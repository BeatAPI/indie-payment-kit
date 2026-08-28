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

Version `0.2.0` claims `selectable` and `managed-provider-source` for the eight catalog providers.
Stripe and Dodo additionally claim `orchestrated-preview` across the initial framework matrix.
No provider claims `sandbox-verified` yet.

Do not infer `sandbox-verified` or `production-reference` from the existence of
an official provider Skill, generated code, a successful build, a checkout page opening, or a
dashboard configuration screen.
