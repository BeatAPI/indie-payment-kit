# Polar adapter

Use Polar for SaaS, APIs, digital products, and open-source monetization when
its Merchant of Record, benefits, checkout, and customer portal model fit.

## Internal official provider pack

- Official Skills: https://github.com/polarsource/skills
- Documentation: https://docs.polar.sh/

The official repository includes setup, integration, testing, and migration
Skills. Load `setup-polar` for a new project, `polar-integration` for
checkout/portal/webhooks, or `polar-migration` for provider changes without exposing them as
separate user entry points.

## Confirm before implementation

- current seller onboarding, payout, fee, and product coverage;
- benefit/entitlement ownership and revocation;
- sandbox versus production resources;
- migration support for customers and active subscriptions;
- webhook verification and replay behavior.

Do not assume provider benefits replace the application's complete entitlement
ledger or reconciliation policy.
