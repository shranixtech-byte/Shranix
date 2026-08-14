# Runbook 12 — Customer Recovery

**Goal:** Help legitimate customers recover without data loss (17.44/17.51).

## Scenarios + safe paths

| Customer situation        | Safe recovery path                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| PC replaced               | New device activation; transfer device slot (Phase 13)                                   |
| SSD replaced              | Device transfer / re-activation; hardware signals are supporting, not sole (15.12/15.13) |
| Windows reinstalled       | Re-activation on same installation identity; server validation                           |
| Motherboard replaced      | Device transfer with customer authentication; confidence model → online revalidation     |
| Temporary internet outage | Bounded offline/grace policy (15.35) — no data loss                                      |
| Activation corrupted      | Re-activation via portal login; integrity hash re-issued                                 |
| License expired + renewed | Grace period → renewal re-activates; never data loss                                     |

## Steps

1. **Authenticate the customer** (portal login / email verification / support identity check).
2. **Verify license ownership** — never reveal existence of others' licenses (15.16).
3. **Pick the least-invasive fix** from the table above.
4. **Use the supported flows** — device transfer, deactivate, reactivate, recovery request, admin approval:
   - `POST /licenses/transfers` (admin approval when needed)
   - Device force-deactivate with audit reason (17.18)
5. **Confirm on the customer's machine**: license status healthy, ERP login works.

## Guarantees

- Customer data (ERP data, subscriptions, billing history) is never deleted by security controls (15.x).
- A single hardware change never permanently locks a device (15.13).

## Never

- Never require re-purchase for a legitimate hardware change.
- Never auto-ban on weak signals (15.14).
