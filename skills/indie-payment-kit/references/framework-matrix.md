# Framework and hosting matrix

Payment providers expose APIs; frameworks determine where secrets, checkout endpoints, raw webhook
bodies, and deployment configuration live. Detect both the user interface and the trusted server.

| Detected target | Checkout and webhook placement | Current execution |
|---|---|---|
| Existing payment domain | Existing modules, routes, data, and config | `extend-existing`; no generic writes |
| Next.js App Router | `app/` or `src/app` payment routes plus `lib/payments` domain files | One-time Stripe/Dodo sandbox starter or agent-guided |
| Next.js Pages Router | Detected `pages` or `src/pages` API tree | Agent-guided |
| TanStack Start | `src/routes/api/payments/<provider>/*.ts` | Agent-guided from official provider pack |
| Hono | Framework-native routes under the existing server module | Agent-guided from official provider pack |
| Express/Fastify/Node | Existing router/service conventions | Agent-guided from official provider pack |
| HTML/SPA + existing API | HTML button plus API checkout/webhook routes | Agent-guided from official provider pack |
| Static HTML only | Hosted Payment Link and return page | Payment Link only |

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
