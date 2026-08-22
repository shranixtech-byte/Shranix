# H41 — Razorpay Sandbox Payment Provisioning Gate & Operator Guide

**Checkpoint**: H41
**Date**: 2026-08-23
**Status**: BLOCKED — Operator action required
**Baseline**: H40 (`00d4d04`)

---

## 1. Access Status

| Item                    | Status        |
| ----------------------- | ------------- |
| RAZORPAY_KEY_ID         | NOT SET       |
| RAZORPAY_KEY_SECRET     | NOT SET       |
| RAZORPAY_WEBHOOK_SECRET | NOT SET       |
| Razorpay SDK            | NOT INSTALLED |
| **Overall**             | **BLOCKED**   |

## 2. Existing Payment Architecture

The application has a complete payment integration:

| Component                | Status    | Location                                                      |
| ------------------------ | --------- | ------------------------------------------------------------- |
| Billing Controller       | ✅ Active | `backend/src/commercial/controllers/billing.controller.ts`    |
| Billing Payments Service | ✅ Active | `backend/src/commercial/services/billing-payments.service.ts` |
| Webhook Endpoint         | ✅ Active | `POST /billing/webhook`                                       |
| Idempotency              | ✅ Active | `idempotencyKey` enforced                                     |
| Signature Verification   | ✅ Active | Webhook signature check                                       |
| Rate Limiting            | ✅ Active | `THROTTLE_WEBHOOK`                                            |
| H8 Test Suite            | ✅ Active | `backend/src/commercial/h8-payment-webhook.test.ts`           |

### Payment Flow

```
Order Created → Payment Attempt → Webhook Received → Signature Verified → Idempotency Checked → Invoice Updated → Audit Logged
```

### Key Controls

- ✅ Idempotency key required for all payments
- ✅ Duplicate idempotency key rejection (unique constraint)
- ✅ Webhook signature verification
- ✅ Webhook rate limiting
- ✅ No card data stored
- ✅ No secrets in source code

## 3. What Needs to Happen

### Step 1: Create Razorpay Account (~5 minutes)

1. Go to https://dashboard.razorpay.com
2. Sign up (free tier)
3. Complete basic KYC (test mode doesn't require full KYC)
4. Switch to **Test Mode** (toggle in dashboard)

### Step 2: Get Sandbox API Keys (~2 minutes)

1. Razorpay Dashboard → Settings → API Keys
2. Click "Generate Test Key"
3. Copy:
   - **Key ID**: `rzp_test_...`
   - **Key Secret**: (shown once, save securely)

### Step 3: Configure Webhook (~5 minutes)

1. Razorpay Dashboard → Settings → Webhooks
2. Click "Add New Webhook"
3. Configure:
   - **Webhook URL**: `https://api-staging.shranix.com/billing/webhook`
   - **Secret**: (generate a secure random string)
   - **Events**: Select:
     - `payment.authorized`
     - `payment.captured`
     - `payment.failed`
     - `order.paid`
     - `refund.created`
     - `refund.processed`

### Step 4: Configure Environment Variables (~2 minutes)

Backend (Railway):

```
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=<from dashboard>
RAZORPAY_WEBHOOK_SECRET=<your webhook secret>
RAZORPAY_MODE=sandbox
```

### Step 5: Verify (~5 minutes)

1. Create a test order via API
2. Complete payment using Razorpay test card
3. Verify webhook received
4. Check signature verification works
5. Confirm idempotency on duplicate webhook

**Total estimated time: ~20 minutes**

## 4. Required Environment Variables

| Variable                  | Required | Purpose                        | Secret? |
| ------------------------- | -------- | ------------------------------ | ------- |
| `RAZORPAY_KEY_ID`         | Yes      | Sandbox API key ID             | Yes     |
| `RAZORPAY_KEY_SECRET`     | Yes      | Sandbox API key secret         | Yes     |
| `RAZORPAY_WEBHOOK_SECRET` | Yes      | Webhook signature verification | Yes     |
| `RAZORPAY_MODE`           | Yes      | sandbox/production             | No      |

## 5. Test Card Details (Sandbox)

| Card      | Number              | Expiry     | CVV | Result          |
| --------- | ------------------- | ---------- | --- | --------------- |
| Success   | 4111 1111 1111 1111 | Any future | Any | Payment success |
| Failure   | 4000 0000 0000 0002 | Any future | Any | Payment failure |
| 3D Secure | 4111 1111 1111 1111 | Any future | Any | Requires OTP    |

**Note**: Never use real card numbers. Only use sandbox test cards.

## 6. Webhook Events

| Event                | Trigger            | Expected Action       |
| -------------------- | ------------------ | --------------------- |
| `payment.authorized` | Payment authorized | Record payment        |
| `payment.captured`   | Payment captured   | Mark invoice paid     |
| `payment.failed`     | Payment failed     | Record failure        |
| `order.paid`         | Order fully paid   | Activate subscription |
| `refund.created`     | Refund initiated   | Record refund         |
| `refund.processed`   | Refund completed   | Update payment state  |

## 7. Idempotency Behavior

| Scenario                | Expected Result                       |
| ----------------------- | ------------------------------------- |
| Duplicate webhook       | Rejected (idempotency key collision)  |
| Retry after success     | No double processing                  |
| Concurrent webhooks     | Unique constraint prevents duplicates |
| Partial failure + retry | Safe to retry, idempotent             |

## 8. Signature Verification

The webhook handler verifies Razorpay signatures:

- Uses HMAC-SHA256
- Compares computed signature with received signature
- Rejects requests with invalid signatures
- Never processes unsigned webhooks

## 9. Failure Handling

| Failure                       | Response        | Action                  |
| ----------------------------- | --------------- | ----------------------- |
| Invalid signature             | 400 Bad Request | Reject webhook          |
| Missing idempotency key       | 400 Bad Request | Reject payment          |
| Duplicate idempotency key     | 409 Conflict    | Return existing payment |
| Provider verification failure | 400 Bad Request | Reject payment          |
| Unknown webhook event         | 200 OK (ignore) | Log and skip            |

## 10. Rollback Procedure

### Razorpay Rollback

- Razorpay is external — no code rollback needed
- If DSN is wrong, webhooks won't arrive (no harm)
- Disable webhook in Razorpay dashboard if needed

### Package Rollback

```bash
pnpm remove razorpay  # if installed
```

### Configuration Rollback

- Remove RAZORPAY_* from environment
- Redeploy

## 11. Known Limitations

| Limitation           | Impact                     | Mitigation                          |
| -------------------- | -------------------------- | ----------------------------------- |
| Sandbox only         | No real payments           | Use test cards                      |
| Free tier limits     | 100 transactions/month     | Sufficient for staging              |
| Webhook delivery     | May have delays            | Check dashboard for delivery status |
| No test mode refunds | Refunds need special setup | Use Razorpay test refund API        |

## 12. Post-Deployment Checklist

- [ ] Razorpay account created
- [ ] Test mode enabled
- [ ] Sandbox API keys generated
- [ ] Webhook URL configured
- [ ] Webhook secret set
- [ ] RAZORPAY_KEY_ID set in Railway
- [ ] RAZORPAY_KEY_SECRET set in Railway
- [ ] RAZORPAY_WEBHOOK_SECRET set in Railway
- [ ] Test order created
- [ ] Test payment completed
- [ ] Webhook received and verified
- [ ] Signature verification works
- [ ] Idempotency verified
- [ ] No secrets in logs
- [ ] Audit events logged

## 13. Blocker Dependencies

| Dependency      | Status  | Provider         |
| --------------- | ------- | ---------------- |
| Backend hosting | BLOCKED | Railway (H37)    |
| Domain/TLS      | BLOCKED | Cloudflare (H39) |
| Database        | BLOCKED | Neon (H34)       |
| Monitoring      | BLOCKED | Sentry (H40)     |

## 14. Evidence

No live evidence available — Razorpay access is BLOCKED.
All configuration is code-verified against the repository.
Payment architecture, idempotency, signature verification, and webhook handling are all verified in source code.
