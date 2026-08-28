# Orchestration contract

The root Skill owns the complete developer experience. Provider packs are versioned implementation
knowledge, not separate assistants the user must operate.

## Responsibility boundary

```text
Developer request
  -> inspect project
  -> choose route and provider
  -> confirm external download and repository writes
  -> load selected official provider pack internally
  -> implement in the detected framework
  -> validate locally
  -> configure sandbox prerequisites
  -> exercise checkout and webhook
  -> report evidence and blockers
```

The provider pack owns current API names, SDK calls, signature primitives, product capabilities,
and provider test mechanisms. Indie Payment Kit owns file placement, local domain models,
multi-channel coordination, tests, evidence states, and the continuity of the user conversation.

## Required integration outputs

For a trusted-server project, the implementation is incomplete until it has:

- one server-side checkout entry point;
- one provider-specific webhook endpoint;
- a stable order or purchase-intent record;
- immutable provider event receipts or an equivalent idempotency store;
- explicit entitlement grant and revocation behavior;
- test/live environment separation;
- environment-variable names documented without values;
- local tests and a reproducible sandbox procedure.

Static-only projects may use hosted Payment Links. Label this `payment-link` mode and state that
verified webhook fulfillment and automated entitlements require a backend.

## Execution states

```text
inspected
  -> provider-confirmed
  -> provider-pack-ready
  -> code-written
  -> local-validation-passed
  -> sandbox-configured
  -> sandbox-checkout-opened
  -> sandbox-payment-verified
  -> sandbox-lifecycle-verified
```

Any state may move to `blocked` with a named missing prerequisite. Production states are separate
and require fresh authorization; sandbox evidence never promotes itself to production evidence.

## Failure behavior

- Provider-pack download fails: keep the local project unchanged and report the source and error.
- Provider pack cannot be discovered: read its installed project-local files directly.
- Package installation fails: preserve the lockfile error and do not generate code against a
  missing dependency.
- Framework is ambiguous: inspect route and server conventions before writing; do not default to
  Next.js.
- Credentials are missing: finish non-secret local work and list key names only.
- Webhook cannot reach localhost: use the provider's official CLI or a user-approved tunnel.
- Sandbox API is unavailable: preserve local tests and report `not tested`; do not fabricate a pass.
