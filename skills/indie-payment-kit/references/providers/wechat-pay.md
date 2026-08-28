# WeChat Pay adapter

Use WeChat Pay for mainland-China merchant scenarios after selecting the right
product: JSAPI, mini-program, H5, Native, App, service-provider, or another
official route.

## Official handoff

- Official Skills: https://github.com/wechatpay-apiv3/wechatpay-skills
- Merchant documentation: https://pay.wechatpay.cn/doc/v3/merchant/4012791875

The official Skill provides product selection, official examples, integration
quality review, and troubleshooting. Load it after the domestic route is
confirmed; do not reproduce its full product knowledge here.

## Confirm before implementation

- merchant type, qualification, and direct-merchant versus service-provider role;
- AppID/merchant association and OpenID requirements;
- selected client surface and payment product;
- API v3 key, merchant private key, serial number, and platform public key or
  certificate handling;
- callback decryption, signature verification, idempotency, refund, query, and
  reconciliation behavior.

Small or micro merchant routes are conditional. Do not present them as a
universal way for any individual developer to obtain online payment access.
