# Contributing

Contributions are welcome for provider data, decision rules, framework
patterns, lifecycle checks, tests, and documentation corrections.

## Provider changes

Every provider change must:

1. cite a current official provider source;
2. update `provider-catalog.json` and the matching provider adapter together;
3. preserve the difference between product fit and merchant eligibility;
4. avoid affiliate-driven ranking or disclose the relationship explicitly;
5. add or update a behavioral test when recommendation order changes.

Do not copy a provider's full Skill or documentation into this repository.
Keep adapters focused on selection, official handoff, and shared acceptance
gates.

## Verification

```bash
npm run verify
```

For Skill or plugin changes, also run the official local validators documented
in the README.

## Pull requests

Explain:

- what developer problem changed;
- which official sources support the change;
- which recommendation or launch gate changes;
- how the change was tested.
