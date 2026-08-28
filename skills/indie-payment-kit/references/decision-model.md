# Payment decision model

Use this model when the user has not already selected a provider. Infer facts
from the project and request before asking questions.

## Inputs

- **Market**: `global`, `china`, or `both`.
- **Entity**: `individual`, `china-business`, or `global-business`.
- **Product**: `saas`, `digital-goods`, `api`, `physical`, or `marketplace`.
- **Billing**: `one-time`, `subscription`, `usage`, or `credits`.
- **Tax preference**: `managed` when the seller wants a Merchant of Record;
  `self` when the seller will remain merchant of record and manage obligations.
- **Stack**: `nextjs`, `tanstack`, `hono`, `node`, `html`, or `other`.

Stack describes code placement, not provider eligibility. Inspect trusted-server capability
separately: a static HTML page can redirect to a hosted Payment Link, while dynamic checkout,
verified webhooks, and entitlements require a backend or serverless function.

The entity value describes routing context, not a legal conclusion. A Chinese
company may still qualify for a global provider, and an individual may qualify
as a sole proprietor or through a conditional small-merchant program. Verify
current provider rules before representing eligibility as confirmed.

## Route first, provider second

1. Choose direct processing, Merchant of Record, mainland-China domestic, or a
   dual-market combination.
2. Rank providers inside the route based on product and billing fit.
3. Verify current countries, prohibited businesses, settlement, reserves,
   currencies, fees, and account requirements from official sources.

Do not compare direct processors and Merchant of Record providers as if they
sell the same legal and operational service.

## Strong default signals

- Global + managed tax + digital product: start with the MoR route.
- Global + self-managed tax + physical or marketplace: start with direct
  processing.
- Mainland China + Chinese business: start with Alipay and WeChat Pay product
  selection.
- Both markets: produce two coordinated rails and a unified internal order and
  entitlement model.
- Individual + mainland China: show qualification uncertainty prominently;
  never route to grey-market aggregators.

## Recommendation output

Return:

- primary route and provider;
- one real alternative;
- reasons tied to the supplied profile;
- merchant-eligibility assumptions;
- operational cautions;
- official provider-pack and docs sources;
- the next reversible action inside Indie Payment Kit.

The committed recommender is transparent and deterministic. Use it as a
baseline, then update or override the conclusion only with newer official evidence or project
facts. Never end the recommendation by asking the developer to invoke the provider Skill.
