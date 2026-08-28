# Creem adapter

Use Creem for eligible global digital products when its Merchant of Record,
checkout, subscription, and license-key model fits the seller.

## Official handoff

- Official AI guidance: https://docs.creem.io/code/sdks/ai-agents
- Documentation: https://docs.creem.io/
- Claude Code marketplace: `/plugin marketplace add armitage-labs/creem`
- Claude Code Skill: `/plugin install creem-api@creem-skills`

Use current official guidance for API schemas, webhook signatures, test mode,
subscriptions, and license keys. Add the official MCP only when the user wants
account operations and has authorized that connection.

## Confirm before implementation

- current merchant and product eligibility;
- seller country, payout methods, settlement, fees, and reserves;
- subscription and license-key lifecycle events;
- test versus production endpoints and identifiers;
- refund/dispute consequences for local entitlements.

Never hardcode API keys or treat a license-key issuance event as sufficient
proof that every product entitlement is reconciled.
