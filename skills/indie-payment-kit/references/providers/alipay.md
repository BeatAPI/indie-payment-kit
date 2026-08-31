# Alipay adapter

Use Alipay for mainland-China merchant checkout only after identifying the
specific product and merchant route. Keep merchant payment integration separate
from agent-wallet and HTTP 402 payment products.

## Internal official provider pack

- Official payment Skills: https://github.com/alipay/payment-skills
- Additional integration resources: https://github.com/alipay/ai
- Open Platform: https://open.alipay.com/
Load `alipay-payment-skill` into `.indie-payment-kit/packs/`. Do not run wallet authorization or
live payment operations unless the user explicitly asks and approves the exact action.

Select and load the official merchant-integration Skill inside Indie Payment Kit for website, app,
mini-program, or service-provider checkout. Use the agent-payment package only when the request
actually concerns agent wallets, cashier links, or 402 flows.

## Confirm before implementation

- merchant entity and selected Alipay product approval;
- website, app, mini-program, face-to-face, or service-provider role;
- key type, signing algorithm, public-key source, and callback URL;
- synchronous return versus asynchronous notification semantics;
- refund, close, query, reconciliation, and settlement requirements.

Verify notifications using the official signing method. A synchronous return
page is not payment truth.
