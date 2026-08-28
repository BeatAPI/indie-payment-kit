# Framework and hosting matrix

Payment providers expose APIs; frameworks determine where secrets, checkout endpoints, raw webhook
bodies, and deployment configuration live. Detect both the user interface and the trusted server.

| Detected target | Checkout and webhook placement | Full lifecycle? |
|---|---|---|
| Next.js App Router | `app/api/payments/<provider>/**/route.ts` | Yes |
| TanStack Start | `src/routes/api/payments/<provider>/*.ts` | Yes |
| Hono | Framework-native routes under the existing server module | Yes |
| Express/Fastify/Node | Existing router/service conventions | Yes |
| HTML/SPA + existing API | HTML button plus API checkout/webhook routes | Yes |
| Static HTML only | Hosted Payment Link and return page | No |

## Static HTML rule

Browser code can use publishable identifiers and redirect to a hosted checkout. It must not contain
secret keys, create privileged sessions directly, verify webhooks, or grant paid access. Offer two
explicit paths:

1. retain static hosting and use a limited Payment Link flow; or
2. add a serverless/backend endpoint and implement the full lifecycle.

## Framework adapters

Prefer an official framework adapter when it exists and is current. Otherwise use the provider's
official server SDK behind a small project-local adapter. The shared lifecycle contract remains the
same; only request/response primitives, raw-body access, environment loading, and file placement
change.

Do not infer that React, Vite, or an `index.html` file provides a trusted server. Conversely, do not
force a backend-only project to add a frontend framework just to integrate checkout.
