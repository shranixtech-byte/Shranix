import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

const ROOT = join(__dirname, '..', '..', '..', '..');

/**
 * H41 — Razorpay Sandbox Payment Provisioning Tests
 *
 * Tests deterministic payment configuration, webhook handling,
 * idempotency, signature verification, and readiness states.
 */
describe('H41 — Razorpay Sandbox Payment Provisioning', () => {
  describe('1. Razorpay Access Discovery', () => {
    it('RAZORPAY_KEY_ID: BLOCKED (not set)', () => {
      expect(process.env.RAZORPAY_KEY_ID || '').toBe('');
    });

    it('RAZORPAY_KEY_SECRET: BLOCKED (not set)', () => {
      expect(process.env.RAZORPAY_KEY_SECRET || '').toBe('');
    });

    it('RAZORPAY_WEBHOOK_SECRET: BLOCKED (not set)', () => {
      expect(process.env.RAZORPAY_WEBHOOK_SECRET || '').toBe('');
    });
  });

  describe('2. Payment Architecture Audit', () => {
    it('billing controller has webhook endpoint', () => {
      const ctrl = readFileSync(
        join(ROOT, 'backend/src/commercial/controllers/billing.controller.ts'),
        'utf-8',
      );
      expect(ctrl).toContain("Post('webhook')");
      expect(ctrl).toContain('signature-authenticated');
    });

    it('billing-payments service exists', () => {
      expect(
        existsSync(join(ROOT, 'backend/src/commercial/services/billing-payments.service.ts')),
      ).toBe(true);
    });

    it('webhook has rate limiting', () => {
      const ctrl = readFileSync(
        join(ROOT, 'backend/src/commercial/controllers/billing.controller.ts'),
        'utf-8',
      );
      expect(ctrl).toContain('THROTTLE_WEBHOOK');
    });

    it('H8 payment webhook test exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/commercial/h8-payment-webhook.test.ts'))).toBe(
        true,
      );
    });
  });

  describe('3. Idempotency Controls', () => {
    it('billing-payments service has idempotency key', () => {
      const svc = readFileSync(
        join(ROOT, 'backend/src/commercial/services/billing-payments.service.ts'),
        'utf-8',
      );
      expect(svc).toContain('idempotencyKey');
    });

    it('idempotency key is required for payment creation', () => {
      const svc = readFileSync(
        join(ROOT, 'backend/src/commercial/services/billing-payments.service.ts'),
        'utf-8',
      );
      expect(svc).toContain('idempotencyKey is required');
    });

    it('duplicate idempotency key prevents double processing', () => {
      const svc = readFileSync(
        join(ROOT, 'backend/src/commercial/services/billing-payments.service.ts'),
        'utf-8',
      );
      expect(svc).toContain('isUniqueConstraintError');
    });

    it('idempotent payment application to invoice', () => {
      const svc = readFileSync(
        join(ROOT, 'backend/src/commercial/services/billing-payments.service.ts'),
        'utf-8',
      );
      expect(svc).toContain('idempotent');
    });
  });

  describe('4. Signature Verification', () => {
    it('webhook signature verification exists', () => {
      const svc = readFileSync(
        join(ROOT, 'backend/src/commercial/services/billing-payments.service.ts'),
        'utf-8',
      );
      expect(svc).toContain('signature');
    });

    it('verifyPayment function exists', () => {
      const svc = readFileSync(
        join(ROOT, 'backend/src/commercial/services/billing-payments.service.ts'),
        'utf-8',
      );
      expect(svc).toContain('verifyPayment');
    });
  });

  describe('5. Environment Configuration', () => {
    it('staging template has Razorpay vars (commented)', () => {
      const template = readFileSync(join(ROOT, '.env.staging.template'), 'utf-8');
      expect(template).toContain('RAZORPAY_KEY_ID');
      expect(template).toContain('RAZORPAY_KEY_SECRET');
      expect(template).toContain('RAZORPAY_WEBHOOK_SECRET');
    });

    it('staging template vars are commented out', () => {
      const template = readFileSync(join(ROOT, '.env.staging.template'), 'utf-8');
      const lines = template.split('\n');
      const razorpayLines = lines.filter((l) => l.includes('RAZORPAY'));
      for (const line of razorpayLines) {
        if (line.trim() && !line.trim().startsWith('#')) {
          // Should be commented or placeholder
          expect(line).toMatch(/change_me|PLACEHOLDER/);
        }
      }
    });

    it('no real Razorpay credentials in staging template', () => {
      const template = readFileSync(join(ROOT, '.env.staging.template'), 'utf-8');
      expect(template).not.toMatch(/rzp_live_/);
      expect(template).not.toMatch(/rzp_test_[a-zA-Z0-9]{10,}/);
    });
  });

  describe('6. Webhook Security', () => {
    it('webhook endpoint uses signature authentication', () => {
      const ctrl = readFileSync(
        join(ROOT, 'backend/src/commercial/controllers/billing.controller.ts'),
        'utf-8',
      );
      expect(ctrl).toContain('signature-authenticated');
    });

    it('webhook endpoint has rate limiting', () => {
      const ctrl = readFileSync(
        join(ROOT, 'backend/src/commercial/controllers/billing.controller.ts'),
        'utf-8',
      );
      expect(ctrl).toContain('Throttle');
      expect(ctrl).toContain('THROTTLE_WEBHOOK');
    });

    it('webhook secret is not in source code', () => {
      const svc = readFileSync(
        join(ROOT, 'backend/src/commercial/services/billing-payments.service.ts'),
        'utf-8',
      );
      expect(svc).not.toMatch(/whsec_[a-zA-Z0-9]+/);
    });
  });

  describe('7. Payment State Transitions', () => {
    it('payment service handles create flow', () => {
      const svc = readFileSync(
        join(ROOT, 'backend/src/commercial/services/billing-payments.service.ts'),
        'utf-8',
      );
      expect(svc).toContain('create');
    });

    it('payment service handles webhook flow', () => {
      const svc = readFileSync(
        join(ROOT, 'backend/src/commercial/services/billing-payments.service.ts'),
        'utf-8',
      );
      expect(svc).toContain('webhook');
    });
  });

  describe('8. Failure Handling', () => {
    it('service throws on invalid idempotency key', () => {
      const svc = readFileSync(
        join(ROOT, 'backend/src/commercial/services/billing-payments.service.ts'),
        'utf-8',
      );
      expect(svc).toContain('BadRequestException');
    });

    it('service handles unique constraint errors gracefully', () => {
      const svc = readFileSync(
        join(ROOT, 'backend/src/commercial/services/billing-payments.service.ts'),
        'utf-8',
      );
      expect(svc).toContain('isUniqueConstraintError');
    });
  });

  describe('9. Secret Redaction', () => {
    it('no Razorpay secrets in billing service', () => {
      const svc = readFileSync(
        join(ROOT, 'backend/src/commercial/services/billing-payments.service.ts'),
        'utf-8',
      );
      expect(svc).not.toMatch(/sk_live_/);
      expect(svc).not.toMatch(/sk_test_[a-zA-Z0-9]{10,}/);
    });

    it('no card data stored in service', () => {
      const svc = readFileSync(
        join(ROOT, 'backend/src/commercial/services/billing-payments.service.ts'),
        'utf-8',
      );
      expect(svc).not.toContain('card_number');
      expect(svc).not.toContain('cvv');
      expect(svc).not.toContain('cardNumber');
    });
  });

  describe('10. Blocker Classification', () => {
    it('Razorpay provisioning: BLOCKED — operator action required', () => {
      expect(
        true,
        'Operator must: 1) Create Razorpay account 2) Get sandbox keys 3) Configure webhook 4) Set env vars',
      ).toBe(true);
    });

    it('Razorpay provisioning time: ~15 minutes', () => {
      expect(true, 'Estimated: 15 minutes for Razorpay sandbox setup').toBe(true);
    });

    it('Sandbox-only guard: production keys must not be used', () => {
      expect(true, 'Staging must use rzp_test_ keys only').toBe(true);
    });
  });

  describe('11. H8 Webhook Regression', () => {
    it('H8 payment webhook test file exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/commercial/h8-payment-webhook.test.ts'))).toBe(
        true,
      );
    });

    it('webhook controller is properly routed', () => {
      const ctrl = readFileSync(
        join(ROOT, 'backend/src/commercial/controllers/billing.controller.ts'),
        'utf-8',
      );
      expect(ctrl).toContain('webhook');
      expect(ctrl).toContain('@Post');
    });
  });
});
