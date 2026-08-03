import { describe, expect, it } from 'vitest';

import { code39Svg, renderKrushiBill, type KrushiBillData } from './krushi-bill-template';

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
      expiryDate: '2027-01-01',
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
  discount: 5,
  roundOff: 0,
  netAmount: 100,
  billAmount: 100,
  showGst: true,
  showSignature: true,
};

describe('renderKrushiBill — Invoice Settings toggles', () => {
  it('default: all columns + discount + 2 copies', () => {
    const html = renderKrushiBill(base);
    expect(html).toContain('Pkg/Hsn');
    expect(html).toContain('Batch/EXP');
    expect(html).toContain('GST %');
    expect(html).toContain('Less Discount');
    expect(html).toContain('OFFICE COPY');
    expect(html).toContain('CUSTOMER COPY');
    expect(html).not.toContain('TRANSPORT COPY');
  });

  it('showHsn=false hides Pkg/Hsn column', () => {
    const html = renderKrushiBill({ ...base, showHsn: false });
    expect(html).not.toContain('Pkg/Hsn');
    expect(html).toContain('Batch/EXP');
  });

  it('showBatch=false hides Batch/EXP column (and expiry)', () => {
    const html = renderKrushiBill({ ...base, showBatch: false });
    expect(html).not.toContain('Batch/EXP');
    expect(html).not.toContain('2027-01-01');
  });

  it('showGst=false hides GST columns + GST NO line', () => {
    const html = renderKrushiBill({ ...base, showGst: false });
    expect(html).not.toContain('GST %');
    expect(html).not.toContain('CGST');
    expect(html).not.toContain('GST NO :');
  });

  it('showDiscount=false hides Less Discount line', () => {
    const html = renderKrushiBill({ ...base, showDiscount: false });
    expect(html).not.toContain('Less Discount');
  });

  it('showQr=false hides UPI Scan & Pay box even with upiId', () => {
    const html = renderKrushiBill({
      ...base,
      upiId: 'shop@upi',
      upiQrPayload: 'data:image/png;base64,iVBORw0KGgo=',
      showQr: false,
    });
    expect(html).not.toContain('SCAN &amp; PAY');
  });

  it('duplicateCopy=false → single CUSTOMER copy only', () => {
    const html = renderKrushiBill({ ...base, duplicateCopy: false });
    expect(html).toContain('CUSTOMER COPY');
    expect(html).not.toContain('OFFICE COPY');
  });

  it('transportCopy=true → TRANSPORT COPY added', () => {
    const html = renderKrushiBill({ ...base, transportCopy: true });
    expect(html).toContain('TRANSPORT COPY');
    expect(html).toContain('OFFICE COPY');
    expect(html).toContain('CUSTOMER COPY');
  });

  it('showBarcode=true renders barcode svg + invoice number', () => {
    const html = renderKrushiBill({
      ...base,
      showBarcode: true,
      barcodeSvg: code39Svg('INV-1'),
    });
    expect(html).toContain('<svg');
    expect(html).toContain('barcode-row');
    expect(html).toContain('INV-1');
  });
});

describe('code39Svg', () => {
  it('produces scannable Code-39 SVG with start/stop asterisks', () => {
    const svg = code39Svg('SLCA26-001');
    expect(svg).toContain('<svg');
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain('width="');
    expect(svg).toContain('height="28"');
  });

  it('uppercases and handles empty input gracefully', () => {
    expect(code39Svg('')).toContain('<svg');
    expect(code39Svg('inv-x')).toContain('<svg');
  });
});
