# Security Policy

Payment integrations are security-sensitive. Do not include live credentials,
webhook secrets, customer data, private keys, access tokens, or production
payloads in issues, pull requests, fixtures, or examples.

Report suspected vulnerabilities privately to `support@beatapi.io`. Include a
minimal reproduction with secrets and personal data removed.

Official provider packs are isolated under `.indie-payment-kit/packs/` and must
not remain in agent skill discovery directories. Installer npm packages are
integrity-checked before execution. Project writes reject broad filesystem
targets and symbolic-link destinations.

This project provides integration guidance and local decision tooling. It does
not custody funds or provide a hosted payment service.
