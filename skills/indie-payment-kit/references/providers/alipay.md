# Alipay adapter

Use Alipay for mainland-China merchant checkout only after identifying the
specific product and merchant route. Keep merchant payment integration separate
from agent-wallet and HTTP 402 payment products.

## Official handoff

- Merchant-integration Skills hub: https://github.com/alipay/ai
- Agent payment Skills: https://github.com/alipay/payment-skills
- Open Platform: https://open.alipay.com/
- Agent-payment installer: `npx -y @alipay/agent-payment@latest install`

Select the official merchant-integration Skill for website, app, mini-program,
or service-provider checkout. Use the agent-payment package only when the
request actually concerns agent wallets, cashier links, or 402 flows.

## Confirm before implementation

- merchant entity and selected Alipay product approval;
- website, app, mini-program, face-to-face, or service-provider role;
- key type, signing algorithm, public-key source, and callback URL;
- synchronous return versus asynchronous notification semantics;
- refund, close, query, reconciliation, and settlement requirements.

Verify notifications using the official signing method. A synchronous return
page is not payment truth.
