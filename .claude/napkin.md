# Napkin Runbook

## Domain Behavior Guardrails
1. **[2026-10-22] Subscription contracts belong to their creating app**
   Do instead: use the configured official portal for Shopify Subscriptions; never interpret an empty Customer Account API result or a permission error as proof that the customer has no subscriptions. Adding own-contract scopes does not expose another app's contracts.

## Execution & Validation
1. **[2026-10-22] Model subscription responses explicitly in render tests**
   Do instead: handle MinhaDoggieSubscriptions in the shared API mock and await async ready/error content. The default unknown-operation response otherwise masks missing subscription coverage.
