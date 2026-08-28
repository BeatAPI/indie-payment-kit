# Paddle adapter

Use Paddle for global software and digital products when the seller wants a
Merchant of Record and Paddle's product, country, and billing coverage fit.

## Official handoff

- Agent Skills: https://developer.paddle.com/sdks/ai/agent-skills/
- AI tools overview: https://developer.paddle.com/sdks/ai/
- MCP server: https://developer.paddle.com/sdks/ai/paddle-mcp/
- Universal Skills install: `npx skills add https://developer.paddle.com/`

Use official Skills for checkout, webhooks, subscription synchronization,
pricing, billing history, sandbox testing, and related workflows.

## Confirm before implementation

- product and live-account approval;
- seller payout support and currencies;
- catalog, price, tax, and invoice ownership;
- subscription proration and scheduled-change semantics;
- webhook ordering and local subscription synchronization.

Keep sandbox and live catalog ids separate. Treat the product database, not a
browser checkout completion, as the access-control source.
