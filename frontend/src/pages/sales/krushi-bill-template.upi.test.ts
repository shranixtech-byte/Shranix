import { describe, expect, it } from 'vitest';

import { renderKrushiBill, type KrushiBillData } from './krushi-bill-template';

const base: KrushiBillData = {
  invoiceNo: 'INV-1',
  invoiceDate: '2026-08-02',
  dcNo: 'DC1',
  dcDate: '2026-08-02',
  shopName: 'TEST SHOP',
  shopAddress: 'Pune',
  shopMobile: '9881292045',
  shopGst: '27AAAAA0000A1Z5',
  customerName: 'Ramesh',
  customerAddress: 'Rahata',
  customerGst: '',
  customerMobile: '',
  state: 'Maharashtra',
  placeOfSupply: 'Maharashtra',
  items: [
    {
      description: 'Item A',
      mfgCo: 'M',
      batchNo: 'B1',
      expiryDate: '',
      pkg: 'kg',
      hsn: '1001',
      qty: 1,
      rate: 100,
      amount: 100,
      gstPercent: 5,
      cgst: 2.5,
      sgst: 2.5,
    },
  ],
  totalQty: 1,
  taxableAmount: 100,
  totalCgst: 2.5,
  totalSgst: 2.5,
  grandTotal: 105,
  discount: 0,
  roundOff: 0,
  netAmount: 105,
  billAmount: 105,
  showGst: true,
  showSignature: true,
};

describe('renderKrushiBill — UPI Scan & Pay box', () => {
  it('renders UPI box with QR image + UPI ID when configured', () => {
    const html = renderKrushiBill({
      ...base,
      upiId: 'shop@upi',
      upiQrPayload: 'data:image/png;base64,iVBORw0KGgo=',
    });
    expect(html).toContain('SCAN &amp; PAY');
    expect(html).toContain('UPI ID : shop@upi');
    expect(html).toContain('data:image/png;base64,iVBORw0KGgo=');
    // Dono copies mein aana chahiye (OFFICE + CUSTOMER)
    expect(html.match(/SCAN &amp; PAY/g)?.length).toBe(2);
  });

  it('omits UPI box when no upiId configured', () => {
    const html = renderKrushiBill(base);
    expect(html).not.toContain('SCAN &amp; PAY');
    expect(html).not.toContain('upi-box');
  });

  it('omits box when QR payload missing (QR still loading) — no QR-less flash', () => {
    const html = renderKrushiBill({ ...base, upiId: 'shop@upi' });
    expect(html).not.toContain('SCAN &amp; PAY');
    expect(html).not.toContain('upi-box');
  });

  it('rejects non-image payload (XSS hardening)', () => {
    const html = renderKrushiBill({
      ...base,
      upiId: 'shop@upi',
      upiQrPayload: 'javascript:alert(1)',
    });
    expect(html).not.toContain('javascript:alert');
    expect(html).not.toContain('upi-box');
  });
});
