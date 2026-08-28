# PayPal adapter

Use PayPal as a direct global checkout, invoice, order, or subscription option
when its buyer reach and supported merchant route fit the product. Do not reduce
it to a withdrawal wallet, and do not describe it as a Merchant of Record.

## Official handoff

- Official AI Toolkit: https://github.com/paypal/AI-Toolkit
- Official Agent Toolkit: https://github.com/paypal/agent-toolkit
- AI tools documentation: https://developer.paypal.com/ai-tools/get-started/
- Claude Code plugin: `/plugin install paypal@claude-plugins-official`

Use the official toolkit for current Orders, Subscriptions, Invoices, refunds,
disputes, and MCP operations.

## Confirm before implementation

- PayPal Business production eligibility and target countries;
- Orders versus Subscriptions versus Invoicing;
- capture timing and ownership validation;
- webhook event set and dispute/refund policy;
- whether PayPal is primary checkout or an additional wallet option.

Sandbox access does not prove production approval. Keep product entitlements in
the application and reconcile them from verified server-side outcomes.
