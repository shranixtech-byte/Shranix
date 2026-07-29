import { NestInterceptor, ExecutionContext, CallHandler} from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable} from 'rxjs';
import { tap } from 'rxjs';

import { WorkflowModuleBridgeService } from '../services/workflow-module-bridge.service';

export const WORKFLOW_DOCUMENT_KEY = 'workflow:document';

/**
 * Interceptor that auto-starts a workflow after a document is created via POST.
 *
 * Usage on a controller method:
 *   @SetMetadata(WORKFLOW_DOCUMENT_KEY, { module: 'purchase', documentType: 'purchase_order', templateCode: 'purchase-order', templateName: 'Purchase Order Workflow', amountField: 'totalAmount', numberField: 'orderNumber' })
 *
 * The interceptor reads the response to get the document ID and triggers the workflow.
 */
@Injectable()
export class WorkflowAutoStartInterceptor implements NestInterceptor {
  private readonly logger = new Logger(WorkflowAutoStartInterceptor.name);

  constructor(
    private readonly bridge: WorkflowModuleBridgeService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get(WORKFLOW_DOCUMENT_KEY, context.getHandler());
    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return next.handle().pipe(
      tap((response: any) => {
        if (!response || !response.id) {
          this.logger.warn(`No document ID returned for ${metadata.documentType}, skipping workflow`);
          return;
        }

        const amount = metadata.amountField ? Number(response[metadata.amountField] || 0) : 0;
        const docNumber = metadata.numberField ? response[metadata.numberField] : undefined;

        this.startWorkflow(metadata, response.id, docNumber, amount, user?.id, request).catch((err) => {
          this.logger.warn(`Workflow auto-start failed for ${metadata.documentType} #${response.id}: ${err.message}`);
        });
      }),
    );
  }

  private async startWorkflow(
    metadata: any,
    documentId: string,
    documentNumber: string | undefined,
    amount: number,
    userId: string | undefined,
    _request: any,
  ): Promise<void> {
    const { module, documentType, templateCode, templateName } = metadata;

    switch (documentType) {
      // Purchase
      case 'purchase_order':
        await this.bridge.afterPurchaseOrderCreated(documentId, documentNumber, amount, userId, _request?.body?.supplierId);
        break;
      case 'purchase_quotation':
        await this.bridge.afterPurchaseQuotationCreated(documentId, documentNumber, amount, userId);
        break;
      case 'goods_receipt':
        await this.bridge.afterGrnCreated(documentId, documentNumber, amount, userId);
        break;
      case 'purchase_invoice':
        await this.bridge.afterPurchaseInvoiceCreated(documentId, documentNumber, amount, userId);
        break;
      case 'purchase_return':
        await this.bridge.afterPurchaseReturnCreated(documentId, documentNumber, amount, userId);
        break;
      // Sales
      case 'sales_quotation':
        await this.bridge.afterSalesQuotationCreated(documentId, documentNumber, amount, userId);
        break;
      case 'sales_order':
        await this.bridge.afterSalesOrderCreated(documentId, documentNumber, amount, userId);
        break;
      case 'delivery_challan':
        await this.bridge.afterDeliveryChallanCreated(documentId, documentNumber, amount, userId);
        break;
      case 'sales_invoice':
        await this.bridge.afterSalesInvoiceCreated(documentId, documentNumber, amount, userId);
        break;
      case 'sales_return':
        await this.bridge.afterSalesReturnCreated(documentId, documentNumber, amount, userId);
        break;
      // Inventory
      case 'stock_adjustment':
        await this.bridge.afterInventoryAdjustmentCreated(documentId, userId);
        break;
      case 'stock_transfer':
        await this.bridge.afterStockTransferCreated(documentId, userId);
        break;
      case 'stock_issue':
        await this.bridge.afterStockIssueCreated(documentId, userId);
        break;
      case 'stock_receipt':
        await this.bridge.afterStockReceiptCreated(documentId, userId);
        break;
      case 'cycle_count':
        await this.bridge.afterCycleCountCreated(documentId, userId);
        break;
      // Finance
      case 'journal_entry':
        await this.bridge.afterJournalEntryCreated(documentId, documentNumber, amount, userId);
        break;
      case 'payment_voucher':
        await this.bridge.afterPaymentVoucherCreated(documentId, userId);
        break;
      case 'receipt_voucher':
        await this.bridge.afterReceiptVoucherCreated(documentId, userId);
        break;
      case 'debit_note':
        await this.bridge.afterDebitNoteCreated(documentId, userId);
        break;
      case 'credit_note':
        await this.bridge.afterCreditNoteCreated(documentId, userId);
        break;
      // GST
      case 'gst_return':
        await this.bridge.afterGstReturnCreated(documentId, userId);
        break;
      case 'gst_adjustment':
        await this.bridge.afterGstAdjustmentCreated(documentId, userId);
        break;
      case 'tax_closing':
        await this.bridge.afterTaxClosingCreated(documentId, userId);
        break;
      case 'year_closing':
        await this.bridge.afterYearClosingCreated(documentId, userId);
        break;
      default:
        // Generic fallback using the hook service directly
        await this.bridge['hook'].afterCreate({
          module,
          documentType,
          documentId,
          documentNumber,
          templateCode,
          templateName,
          amount,
          userId,
        });
    }
  }
}
