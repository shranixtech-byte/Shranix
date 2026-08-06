import { describe, expect, it } from 'vitest';

import {
  numberToWordsINR,
  quotationWatermark,
  renderQuotationPdf,
  renderQuotationPdfWithCopies,
  type QuotationPdfData,
} from './quotation-pdf-template';

const base = (): QuotationPdfData => ({
  quoteNumber: 'SQ-26-27-0001-Rev-2',
  quoteDate: '2026-08-06',
  validTill: '2026-09-05',
  revision: 2,
  status: 'draft',
  companyName: 'SHRANIX Krushi Farms Pvt Ltd',
  companyLogo: '',
  companyAddress: 'At Post Kanadgaon, Tal. Rahata, Ahmednagar - 413720',
  companyPhone: '9881292045',
  companyEmail: 'hello@shranix.com',
  companyGstin: '27AABCS1234A1Z5',
  signatureImage: '',
  invoiceFooter: 'Thank you for your business!',
  customerName: 'Rajesh Patel',
  customerGstin: '27AAACP1234F1Z2',
  customerMobile: '9876543210',
  billingAddress: 'M.G. Road, Ahmednagar',
  shippingAddress: '',
  contactPerson: 'Rajesh Patel',
  paymentTerms: '50% advance, balance before delivery',
  deliveryTime: 'Within 2 Days',
  warranty: '12 months manufacturer warranty',
  customerNotes: '',
  terms: 'Prices valid till date mentioned.\nGoods once sold will not be taken back.',
  items: [
    {
      description: 'Pesticide Alpha 500ml',
      hsn: '38089199',
      qty: 10,
      rate: 250,
      discountAmount: 0,
      discountPercent: 0,
      taxableValue: 2500,
      gstRate: 18,
      cgst: 225,
      sgst: 225,
      igst: 0,
      cess: 0,
      totalAmount: 2950,
    },
  ],
  basicTotal: 2500,
  discountAmount: 0,
  taxable: 2500,
  cgst: 225,
  sgst: 225,
  igst: 0,
  cess: 0,
  gstTotal: 450,
  freight: 0,
  installationCharges: 0,
  roundOff: 0,
  grandTotal: 2950,
  bankAccount: {
    bankName: 'Bank of Maharashtra',
    accountHolderName: 'SHRANIX Krushi Farms',
    accountNumber: '60123456789',
    ifsc: 'MAHB0001234',
    upiId: 'shranix@upi',
  },
  upiId: 'shranix@upi',
  upiQrDataUrl: '',
  barcodeSvg: '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>',
});

describe('renderQuotationPdf — Phase 7 PDF Engine', () => {
  it('renders the quote number, company name and customer name', () => {
    const html = renderQuotationPdf(base());
    expect(html).toContain('SQ-26-27-0001-Rev-2');
    expect(html).toContain('SHRANIX Krushi Farms Pvt Ltd');
    expect(html).toContain('Rajesh Patel');
  });

  it('embeds the company logo image when provided', () => {
    const html = renderQuotationPdf({ ...base(), companyLogo: 'data:image/png;base64,AAA' });
    expect(html).toContain('<img class="qp-logo" src="data:image/png;base64,AAA"');
  });

  it('renders company + customer GSTINs when GST is enabled', () => {
    const html = renderQuotationPdf(base());
    expect(html).toContain('GSTIN : 27AABCS1234A1Z5');
    expect(html).toContain('GSTIN : 27AAACP1234F1Z2');
  });

  it('hides GSTINs when showGst is false', () => {
    const html = renderQuotationPdf({ ...base(), showGst: false });
    expect(html).not.toContain('27AABCS1234A1Z5');
    expect(html).not.toContain('27AAACP1234F1Z2');
  });

  it('shows a DRAFT watermark for draft status and none for approved', () => {
    const draftHtml = renderQuotationPdf(base());
    expect(draftHtml).toContain('qp-watermark');
    expect(draftHtml).toContain('DRAFT');

    const approvedHtml = renderQuotationPdf({ ...base(), status: 'approved' });
    expect(approvedHtml).not.toContain('qp-watermark');
  });

  it('maps pending/under_review/rejected statuses to the correct watermark', () => {
    expect(quotationWatermark('draft')).toBe('DRAFT');
    expect(quotationWatermark('pending')).toBe('PENDING APPROVAL');
    expect(quotationWatermark('under_review')).toBe('PENDING APPROVAL');
    expect(quotationWatermark('rejected')).toBe('REJECTED');
    expect(quotationWatermark('approved')).toBeNull();
    expect(quotationWatermark('sent')).toBeNull();
    expect(quotationWatermark('final')).toBeNull();
  });

  it('renders terms & conditions and the offer options', () => {
    const html = renderQuotationPdf(base());
    expect(html).toContain('Terms &amp; Conditions');
    expect(html).toContain('Prices valid till date mentioned.');
    expect(html).toContain('Payment Terms');
    expect(html).toContain('Within 2 Days');
    expect(html).toContain('12 months manufacturer warranty');
  });

  it('renders bank details when provided', () => {
    const html = renderQuotationPdf(base());
    expect(html).toContain('Bank Details');
    expect(html).toContain('Bank of Maharashtra');
    expect(html).toContain('60123456789');
    expect(html).toContain('MAHB0001234');
  });

  it('omits the bank box when no bank data is present', () => {
    const html = renderQuotationPdf({ ...base(), bankAccount: undefined });
    expect(html).not.toContain('Bank Details');
  });

  it('renders the UPI QR payment box when a QR data URL is provided', () => {
    const html = renderQuotationPdf({
      ...base(),
      upiQrDataUrl: 'data:image/png;base64,QR',
    });
    expect(html).toContain('SCAN &amp; PAY');
    expect(html).toContain('data:image/png;base64,QR');
    expect(html).toContain('shranix@upi');
  });

  it('omits the QR box when no QR is generated', () => {
    const html = renderQuotationPdf(base());
    expect(html).not.toContain('SCAN');
  });

  it('renders the barcode and the amount in words', () => {
    const html = renderQuotationPdf(base());
    expect(html).toContain('<svg');
    expect(html).toContain('Rupees Two Thousand Nine Hundred Fifty Only');
  });

  it('includes signature blocks for company and customer', () => {
    const html = renderQuotationPdf(base());
    expect(html).toContain('Authorised Signatory');
    expect(html).toContain('Customer Acceptance');
  });

  it('escapes HTML in free-text fields', () => {
    const html = renderQuotationPdf({
      ...base(),
      terms: 'Use <script>alert(1)</script> carefully',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('spans the empty-items placeholder across all 9 columns', () => {
    const html = renderQuotationPdf({ ...base(), items: [] });
    expect(html).toContain('colspan="9"');
    expect(html).toContain('No items in this quotation');
  });

  it('labels percent discounts as a percentage, not rupees', () => {
    const html = renderQuotationPdf({
      ...base(),
      items: [{ ...base().items[0], discountPercent: 5, discountAmount: 5 }],
    });
    expect(html).toContain('>5%<');
    expect(html).not.toContain('>₹5.00<');
  });
});

describe('renderQuotationPdfWithCopies — Phase 8', () => {
  it('renders a single customer copy when duplicate is off', () => {
    const html = renderQuotationPdfWithCopies(base(), false);
    expect(html).toContain('QUOTATION');
    expect(html).not.toContain('OFFICE COPY');
    expect(html).not.toContain('CUSTOMER COPY');
    expect(html).not.toContain('CUT HERE');
    expect((html.match(/class="quote-pdf"/g) || []).length).toBe(1);
  });

  it('renders OFFICE + CUSTOMER copies with a cut line when duplicate is on', () => {
    const html = renderQuotationPdfWithCopies(base(), true);
    expect(html).toContain('OFFICE COPY');
    expect(html).toContain('CUSTOMER COPY');
    expect(html).toContain('CUT HERE');
    // Both copies carry the full quotation document
    expect((html.match(/class="quote-pdf"/g) || []).length).toBe(2);
    // Customer copy carries the customer badge variant
    expect(html).toContain('qp-copy-badge customer');
  });
});

describe('numberToWordsINR', () => {
  it('converts basic amounts', () => {
    expect(numberToWordsINR(0)).toBe('Zero Rupees Only');
    expect(numberToWordsINR(100)).toBe('Rupees One Hundred Only');
    expect(numberToWordsINR(1250.5)).toBe(
      'Rupees One Thousand Two Hundred Fifty and Fifty Paise Only',
    );
  });

  it('handles Indian groupings (lakh / crore)', () => {
    expect(numberToWordsINR(1234567)).toBe(
      'Rupees Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Only',
    );
    expect(numberToWordsINR(120000000)).toBe('Rupees Twelve Crore Only');
  });

  it('handles sub-rupee amounts without an empty word', () => {
    expect(numberToWordsINR(0.5)).toBe('Rupees Zero and Fifty Paise Only');
    expect(numberToWordsINR(0.05)).toBe('Rupees Zero and Five Paise Only');
  });

  it('clamps negative amounts to zero', () => {
    expect(numberToWordsINR(-100)).toBe('Zero Rupees Only');
    expect(numberToWordsINR(-0.5)).toBe('Zero Rupees Only');
  });
});
