import { Injectable } from '@nestjs/common';

import { WorkflowHookService } from './workflow-hook.service';

/**
 * Central bridge for all module-workflow integration.
 * Modules call this after document creation.
 * This avoids circular dependency by keeping all workflow logic in WorkflowModule.
 */
@Injectable()
export class WorkflowModuleBridgeService {

  constructor(private readonly hook: WorkflowHookService) {}

  // ── Purchase Document Workflows ──────────────────────────────
  async afterPurchaseOrderCreated(orderId: string, orderNumber: string | undefined, amount: number, userId?: string, supplierId?: string) {
    await this.hook.afterCreate({
      module: 'purchase', documentType: 'purchase_order', documentId: orderId,
      documentNumber: orderNumber, templateCode: 'purchase-order',
      templateName: 'Purchase Order Workflow', amount, userId, supplierId,
    });
  }

  async afterPurchaseQuotationCreated(quoteId: string, quoteNumber: string | undefined, amount: number, userId?: string) {
    await this.hook.afterCreate({
      module: 'purchase', documentType: 'purchase_quotation', documentId: quoteId,
      documentNumber: quoteNumber, templateCode: 'purchase-quotation',
      templateName: 'Purchase Quotation Workflow', amount, userId,
    });
  }

  async afterGrnCreated(grnId: string, grnNumber: string | undefined, amount: number, userId?: string) {
    await this.hook.afterCreate({
      module: 'purchase', documentType: 'goods_receipt', documentId: grnId,
      documentNumber: grnNumber, templateCode: 'purchase-grn',
      templateName: 'GRN Workflow', amount, userId,
    });
  }

  async afterPurchaseInvoiceCreated(invoiceId: string, invoiceNumber: string | undefined, amount: number, userId?: string) {
    await this.hook.afterCreate({
      module: 'purchase', documentType: 'purchase_invoice', documentId: invoiceId,
      documentNumber: invoiceNumber, templateCode: 'purchase-invoice',
      templateName: 'Purchase Invoice Workflow', amount, userId,
    });
  }

  async afterPurchaseReturnCreated(returnId: string, returnNumber: string | undefined, amount: number, userId?: string) {
    await this.hook.afterCreate({
      module: 'purchase', documentType: 'purchase_return', documentId: returnId,
      documentNumber: returnNumber, templateCode: 'purchase-return',
      templateName: 'Purchase Return Workflow', amount, userId,
    });
  }

  // ── Sales Document Workflows ────────────────────────────────
  async afterSalesQuotationCreated(quoteId: string, quoteNumber: string | undefined, amount: number, userId?: string) {
    await this.hook.afterCreate({
      module: 'sales', documentType: 'sales_quotation', documentId: quoteId,
      documentNumber: quoteNumber, templateCode: 'sales-quotation',
      templateName: 'Sales Quotation Workflow', amount, userId,
    });
  }

  async afterSalesOrderCreated(orderId: string, orderNumber: string | undefined, amount: number, userId?: string) {
    await this.hook.afterCreate({
      module: 'sales', documentType: 'sales_order', documentId: orderId,
      documentNumber: orderNumber, templateCode: 'sales-order',
      templateName: 'Sales Order Workflow', amount, userId,
    });
  }

  async afterDeliveryChallanCreated(challanId: string, challanNumber: string | undefined, amount: number, userId?: string) {
    await this.hook.afterCreate({
      module: 'sales', documentType: 'delivery_challan', documentId: challanId,
      documentNumber: challanNumber, templateCode: 'sales-delivery-challan',
      templateName: 'Delivery Challan Workflow', amount, userId,
    });
  }

  async afterSalesInvoiceCreated(invoiceId: string, invoiceNumber: string | undefined, amount: number, userId?: string) {
    await this.hook.afterCreate({
      module: 'sales', documentType: 'sales_invoice', documentId: invoiceId,
      documentNumber: invoiceNumber, templateCode: 'sales-invoice',
      templateName: 'Sales Invoice Workflow', amount, userId,
    });
  }

  async afterSalesReturnCreated(returnId: string, returnNumber: string | undefined, amount: number, userId?: string) {
    await this.hook.afterCreate({
      module: 'sales', documentType: 'sales_return', documentId: returnId,
      documentNumber: returnNumber, templateCode: 'sales-return',
      templateName: 'Sales Return Workflow', amount, userId,
    });
  }

  // ── Inventory Document Workflows ──────────────────────────
  async afterInventoryAdjustmentCreated(adjId: string, userId?: string) {
    await this.hook.afterCreate({
      module: 'inventory', documentType: 'stock_adjustment', documentId: adjId,
      templateCode: 'inventory-adjustment', templateName: 'Stock Adjustment Workflow', userId,
    });
  }

  async afterStockTransferCreated(transferId: string, userId?: string) {
    await this.hook.afterCreate({
      module: 'inventory', documentType: 'stock_transfer', documentId: transferId,
      templateCode: 'inventory-transfer', templateName: 'Stock Transfer Workflow', userId,
    });
  }

  async afterStockIssueCreated(issueId: string, userId?: string) {
    await this.hook.afterCreate({
      module: 'inventory', documentType: 'stock_issue', documentId: issueId,
      templateCode: 'inventory-issue', templateName: 'Stock Issue Workflow', userId,
    });
  }

  async afterStockReceiptCreated(receiptId: string, userId?: string) {
    await this.hook.afterCreate({
      module: 'inventory', documentType: 'stock_receipt', documentId: receiptId,
      templateCode: 'inventory-receipt', templateName: 'Stock Receipt Workflow', userId,
    });
  }

  async afterCycleCountCreated(countId: string, userId?: string) {
    await this.hook.afterCreate({
      module: 'inventory', documentType: 'cycle_count', documentId: countId,
      templateCode: 'inventory-cycle-count', templateName: 'Cycle Count Workflow', userId,
    });
  }

  // ── Finance Document Workflows ──────────────────────────────
  async afterJournalEntryCreated(entryId: string, voucherNumber: string | undefined, amount: number, userId?: string) {
    await this.hook.afterCreate({
      module: 'finance', documentType: 'journal_entry', documentId: entryId,
      documentNumber: voucherNumber, templateCode: 'finance-journal-entry',
      templateName: 'Journal Entry Workflow', amount, userId,
    });
  }

  async afterPaymentVoucherCreated(voucherId: string, userId?: string) {
    await this.hook.afterCreate({
      module: 'finance', documentType: 'payment_voucher', documentId: voucherId,
      templateCode: 'finance-payment-voucher', templateName: 'Payment Voucher Workflow', userId,
    });
  }

  async afterReceiptVoucherCreated(voucherId: string, userId?: string) {
    await this.hook.afterCreate({
      module: 'finance', documentType: 'receipt_voucher', documentId: voucherId,
      templateCode: 'finance-receipt-voucher', templateName: 'Receipt Voucher Workflow', userId,
    });
  }

  async afterDebitNoteCreated(noteId: string, userId?: string) {
    await this.hook.afterCreate({
      module: 'finance', documentType: 'debit_note', documentId: noteId,
      templateCode: 'finance-debit-note', templateName: 'Debit Note Workflow', userId,
    });
  }

  async afterCreditNoteCreated(noteId: string, userId?: string) {
    await this.hook.afterCreate({
      module: 'finance', documentType: 'credit_note', documentId: noteId,
      templateCode: 'finance-credit-note', templateName: 'Credit Note Workflow', userId,
    });
  }

  // ── GST Document Workflows ───────────────────────────────────
  async afterGstReturnCreated(returnId: string, userId?: string) {
    await this.hook.afterCreate({
      module: 'gst', documentType: 'gst_return', documentId: returnId,
      templateCode: 'gst-return', templateName: 'GST Return Workflow', userId,
    });
  }

  async afterGstAdjustmentCreated(adjId: string, userId?: string) {
    await this.hook.afterCreate({
      module: 'gst', documentType: 'gst_adjustment', documentId: adjId,
      templateCode: 'gst-adjustment', templateName: 'GST Adjustment Workflow', userId,
    });
  }

  async afterTaxClosingCreated(closingId: string, userId?: string) {
    await this.hook.afterCreate({
      module: 'gst', documentType: 'tax_closing', documentId: closingId,
      templateCode: 'gst-tax-closing', templateName: 'Tax Closing Workflow', userId,
    });
  }

  async afterYearClosingCreated(closingId: string, userId?: string) {
    await this.hook.afterCreate({
      module: 'gst', documentType: 'year_closing', documentId: closingId,
      templateCode: 'gst-year-closing', templateName: 'Year Closing Workflow', userId,
    });
  }
}
