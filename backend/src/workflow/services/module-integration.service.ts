import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

import { WorkflowIntegrationService } from './workflow-integration.service';

/**
 * Module-specific workflow integration helpers.
 * Injected into each business module to auto-start workflows.
 */

// ── PURCHASE INTEGRATION ─────────────────────────────────────
@Injectable()
export class PurchaseWorkflowIntegration {

  constructor(
    private readonly integration: WorkflowIntegrationService,
    private readonly database: DatabaseService,
  ) {}

  async onPurchaseOrderCreated(orderId: string, userId?: string): Promise<void> {
    const order = await this.database.purchaseOrders.findById(orderId);
    if (!order) { return; }
    await this.integration.startWorkflowForDocument({
      module: 'purchase',
      documentType: 'purchase_order',
      templateCode: 'purchase-order',
      templateName: 'Purchase Order Workflow',
      documentId: orderId,
      documentNumber: (order as any).orderNumber || (order as any).poNumber,
      amount: Number((order as any).totalAmount || (order as any).grandTotal || 0),
      userId,
      metadata: { supplierId: (order as any).supplierId, type: 'purchase_order' },
    });
  }

  async onPurchaseQuotationCreated(quoteId: string, userId?: string): Promise<void> {
    const quote = await this.database.purchaseQuotations.findById(quoteId);
    if (!quote) {return;}
    await this.integration.startWorkflowForDocument({
      module: 'purchase',
      documentType: 'purchase_quotation',
      templateCode: 'purchase-quotation',
      templateName: 'Purchase Quotation Workflow',
      documentId: quoteId,
      documentNumber: (quote as any).quoteNumber,
      amount: Number((quote as any).totalAmount || 0),
      userId,
      metadata: { supplierId: (quote as any).supplierId },
    });
  }

  async onGrnCreated(grnId: string, userId?: string): Promise<void> {
    const grn = await this.database.grn.findById(grnId);
    if (!grn) {return;}
    await this.integration.startWorkflowForDocument({
      module: 'purchase',
      documentType: 'goods_receipt',
      templateCode: 'purchase-grn',
      templateName: 'GRN Workflow',
      documentId: grnId,
      documentNumber: (grn as any).grnNumber,
      amount: Number((grn as any).totalAmount || 0),
      userId,
      metadata: { supplierId: (grn as any).supplierId, poId: (grn as any).purchaseOrderId },
    });
  }

  async onPurchaseInvoiceCreated(invoiceId: string, userId?: string): Promise<void> {
    const invoice = await this.database.purchaseInvoices.findById(invoiceId);
    if (!invoice) {return;}
    await this.integration.startWorkflowForDocument({
      module: 'purchase',
      documentType: 'purchase_invoice',
      templateCode: 'purchase-invoice',
      templateName: 'Purchase Invoice Workflow',
      documentId: invoiceId,
      documentNumber: (invoice as any).invoiceNumber,
      amount: Number((invoice as any).grandTotal || (invoice as any).totalAmount || 0),
      userId,
      metadata: { supplierId: (invoice as any).supplierId },
    });
  }

  async onPurchaseReturnCreated(returnId: string, userId?: string): Promise<void> {
    const ret = await this.database.purchaseReturns.findById(returnId);
    if (!ret) {return;}
    await this.integration.startWorkflowForDocument({
      module: 'purchase',
      documentType: 'purchase_return',
      templateCode: 'purchase-return',
      templateName: 'Purchase Return Workflow',
      documentId: returnId,
      documentNumber: (ret as any).returnNumber,
      amount: Number((ret as any).totalAmount || 0),
      userId,
      metadata: { supplierId: (ret as any).supplierId },
    });
  }
}

// ── SALES INTEGRATION ────────────────────────────────────────
@Injectable()
export class SalesWorkflowIntegration {

  constructor(
    private readonly integration: WorkflowIntegrationService,
    private readonly database: DatabaseService,
  ) {}

  async onQuotationCreated(quoteId: string, userId?: string): Promise<void> {
    const quote = await this.database.salesQuotations.findById(quoteId);
    if (!quote) {return;}
    await this.integration.startWorkflowForDocument({
      module: 'sales', documentType: 'sales_quotation',
      templateCode: 'sales-quotation', templateName: 'Sales Quotation Workflow',
      documentId: quoteId, documentNumber: (quote as any).quoteNumber,
      amount: Number((quote as any).totalAmount || 0), userId,
      metadata: { customerId: (quote as any).customerId },
    });
  }

  async onSalesOrderCreated(orderId: string, userId?: string): Promise<void> {
    const order = await this.database.salesOrders.findById(orderId);
    if (!order) {return;}
    await this.integration.startWorkflowForDocument({
      module: 'sales', documentType: 'sales_order',
      templateCode: 'sales-order', templateName: 'Sales Order Workflow',
      documentId: orderId, documentNumber: (order as any).orderNumber,
      amount: Number((order as any).totalAmount || 0), userId,
      metadata: { customerId: (order as any).customerId },
    });
  }

  async onDeliveryChallanCreated(challanId: string, userId?: string): Promise<void> {
    const challan = await this.database.deliveryChallans.findById(challanId);
    if (!challan) {return;}
    await this.integration.startWorkflowForDocument({
      module: 'sales', documentType: 'delivery_challan',
      templateCode: 'sales-delivery-challan', templateName: 'Delivery Challan Workflow',
      documentId: challanId, documentNumber: (challan as any).challanNumber,
      amount: Number((challan as any).totalAmount || 0), userId,
      metadata: { customerId: (challan as any).customerId },
    });
  }

  async onSalesInvoiceCreated(invoiceId: string, userId?: string): Promise<void> {
    const invoice = await this.database.salesInvoices.findById(invoiceId);
    if (!invoice) {return;}
    await this.integration.startWorkflowForDocument({
      module: 'sales', documentType: 'sales_invoice',
      templateCode: 'sales-invoice', templateName: 'Sales Invoice Workflow',
      documentId: invoiceId, documentNumber: (invoice as any).invoiceNumber,
      amount: Number((invoice as any).grandTotal || (invoice as any).totalAmount || 0), userId,
      metadata: { customerId: (invoice as any).customerId },
    });
  }

  async onSalesReturnCreated(returnId: string, userId?: string): Promise<void> {
    const ret = await this.database.salesReturns.findById(returnId);
    if (!ret) {return;}
    await this.integration.startWorkflowForDocument({
      module: 'sales', documentType: 'sales_return',
      templateCode: 'sales-return', templateName: 'Sales Return Workflow',
      documentId: returnId, documentNumber: (ret as any).returnNumber,
      amount: Number((ret as any).totalAmount || 0), userId,
      metadata: { customerId: (ret as any).customerId },
    });
  }
}

// ── INVENTORY INTEGRATION ────────────────────────────────────
@Injectable()
export class InventoryWorkflowIntegration {
  constructor(private readonly integration: WorkflowIntegrationService, private readonly database: DatabaseService) {}

  async onStockAdjustmentCreated(adjustmentId: string, userId?: string): Promise<void> {
    const adj = await this.database.items.findById(adjustmentId);
    if (!adj) {return;}
    await this.integration.startWorkflowForDocument({
      module: 'inventory', documentType: 'stock_adjustment',
      templateCode: 'inventory-adjustment', templateName: 'Stock Adjustment Workflow',
      documentId: adjustmentId, userId,
      metadata: { type: 'adjustment' },
    });
  }

  async onStockTransferCreated(transferId: string, userId?: string): Promise<void> {
    await this.integration.startWorkflowForDocument({
      module: 'inventory', documentType: 'stock_transfer',
      templateCode: 'inventory-transfer', templateName: 'Stock Transfer Workflow',
      documentId: transferId, userId,
      metadata: { type: 'transfer' },
    });
  }

  async onStockIssueCreated(issueId: string, userId?: string): Promise<void> {
    await this.integration.startWorkflowForDocument({
      module: 'inventory', documentType: 'stock_issue',
      templateCode: 'inventory-issue', templateName: 'Stock Issue Workflow',
      documentId: issueId, userId,
      metadata: { type: 'issue' },
    });
  }

  async onStockReceiptCreated(receiptId: string, userId?: string): Promise<void> {
    await this.integration.startWorkflowForDocument({
      module: 'inventory', documentType: 'stock_receipt',
      templateCode: 'inventory-receipt', templateName: 'Stock Receipt Workflow',
      documentId: receiptId, userId,
      metadata: { type: 'receipt' },
    });
  }

  async onCycleCountCreated(countId: string, userId?: string): Promise<void> {
    await this.integration.startWorkflowForDocument({
      module: 'inventory', documentType: 'cycle_count',
      templateCode: 'inventory-cycle-count', templateName: 'Cycle Count Workflow',
      documentId: countId, userId,
      metadata: { type: 'cycle_count' },
    });
  }
}

// ── FINANCE INTEGRATION ─────────────────────────────────────
@Injectable()
export class FinanceWorkflowIntegration {
  constructor(private readonly integration: WorkflowIntegrationService, private readonly database: DatabaseService) {}

  async onJournalEntryCreated(entryId: string, userId?: string): Promise<void> {
    const entry = await this.database.journalEntries.findById(entryId);
    if (!entry) {return;}
    await this.integration.startWorkflowForDocument({
      module: 'finance', documentType: 'journal_entry',
      templateCode: 'finance-journal-entry', templateName: 'Journal Entry Workflow',
      documentId: entryId, documentNumber: (entry as any).voucherNumber,
      amount: Number((entry as any).totalAmount || 0), userId,
    });
  }

  async onPaymentVoucherCreated(voucherId: string, userId?: string): Promise<void> {
    await this.integration.startWorkflowForDocument({
      module: 'finance', documentType: 'payment_voucher',
      templateCode: 'finance-payment-voucher', templateName: 'Payment Voucher Workflow',
      documentId: voucherId, userId,
    });
  }

  async onReceiptVoucherCreated(voucherId: string, userId?: string): Promise<void> {
    await this.integration.startWorkflowForDocument({
      module: 'finance', documentType: 'receipt_voucher',
      templateCode: 'finance-receipt-voucher', templateName: 'Receipt Voucher Workflow',
      documentId: voucherId, userId,
    });
  }

  async onContraVoucherCreated(voucherId: string, userId?: string): Promise<void> {
    await this.integration.startWorkflowForDocument({
      module: 'finance', documentType: 'contra_voucher',
      templateCode: 'finance-contra-voucher', templateName: 'Contra Voucher Workflow',
      documentId: voucherId, userId,
    });
  }

  async onDebitNoteCreated(noteId: string, userId?: string): Promise<void> {
    await this.integration.startWorkflowForDocument({
      module: 'finance', documentType: 'debit_note',
      templateCode: 'finance-debit-note', templateName: 'Debit Note Workflow',
      documentId: noteId, userId,
    });
  }

  async onCreditNoteCreated(noteId: string, userId?: string): Promise<void> {
    await this.integration.startWorkflowForDocument({
      module: 'finance', documentType: 'credit_note',
      templateCode: 'finance-credit-note', templateName: 'Credit Note Workflow',
      documentId: noteId, userId,
    });
  }
}

// ── GST INTEGRATION ──────────────────────────────────────────
@Injectable()
export class GstWorkflowIntegration {
  constructor(private readonly integration: WorkflowIntegrationService, private readonly database: DatabaseService) {}

  async onGstReturnCreated(returnId: string, userId?: string): Promise<void> {
    const ret = await this.database.gstReturns.findById(returnId);
    if (!ret) {return;}
    await this.integration.startWorkflowForDocument({
      module: 'gst', documentType: 'gst_return',
      templateCode: 'gst-return', templateName: 'GST Return Workflow',
      documentId: returnId, userId,
      amount: Number((ret as any).totalTax || 0),
    });
  }

  async onGstAdjustmentCreated(adjustmentId: string, userId?: string): Promise<void> {
    await this.integration.startWorkflowForDocument({
      module: 'gst', documentType: 'gst_adjustment',
      templateCode: 'gst-adjustment', templateName: 'GST Adjustment Workflow',
      documentId: adjustmentId, userId,
    });
  }

  async onTaxClosingCreated(closingId: string, userId?: string): Promise<void> {
    await this.integration.startWorkflowForDocument({
      module: 'gst', documentType: 'tax_closing',
      templateCode: 'gst-tax-closing', templateName: 'Tax Closing Workflow',
      documentId: closingId, userId,
    });
  }

  async onYearClosingCreated(closingId: string, userId?: string): Promise<void> {
    const closing = await this.database.yearClosingRecords.findById(closingId);
    if (!closing) {return;}
    await this.integration.startWorkflowForDocument({
      module: 'gst', documentType: 'year_closing',
      templateCode: 'gst-year-closing', templateName: 'Year Closing Workflow',
      documentId: closingId, userId,
      documentNumber: (closing as any).closingNumber,
    });
  }
}
