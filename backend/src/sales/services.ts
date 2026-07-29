import { Injectable } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { BaseMasterService } from '../masters/base-master.service';

@Injectable()
export class SalesQuotationsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.salesQuotations, 'SalesQuotation', audit, 'quoteNumber'); }
}
@Injectable()
export class SalesOrdersService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.salesOrders, 'SalesOrder', audit, 'orderNumber'); }
}
@Injectable()
export class DeliveryChallansService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.deliveryChallans, 'DeliveryChallan', audit, 'challanNumber'); }
}
@Injectable()
export class SalesInvoicesService extends BaseMasterService {
  private readonly invoiceItemsRepo: any;

  constructor(
    database: DatabaseService,
    audit: AuditService,
  ) {
    super(database.salesInvoices, 'SalesInvoice', audit, 'invoiceNumber');
    this.invoiceItemsRepo = database.invoiceItems;
  }

  /**
   * Override create to handle invoice + items in one call.
   */
  async create(data: any, userId?: string) {
    // 1) Separate items from invoice data
    const { items, ...invoiceData } = data;

    // 2) Create the invoice record (BaseMasterService.create handles unique check)
    const invoice = await super.create(invoiceData, userId);

    // 3) Create invoice items if provided
    const createdItems: any[] = [];
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const created = await this.invoiceItemsRepo.create({
          invoiceId: invoice.id,
          itemId: item.itemId,
          variantId: item.variantId || null,
          description: item.description || null,
          quantity: item.quantity || 1,
          unitId: item.unitId || null,
          rate: item.rate || 0,
          discountPercent: item.discountPercent || 0,
          discountAmount: item.discountAmount || 0,
          taxableValue: item.taxableValue || 0,
          gstRate: item.gstRate || 0,
          igst: item.igst || 0,
          cgst: item.cgst || 0,
          sgst: item.sgst || 0,
          cess: item.cess || 0,
          totalAmount: item.totalAmount || 0,
        });
        createdItems.push(created);
      }
    }

    // 4) Return invoice with items
    return {
      ...invoice,
      items: createdItems,
    };
  }
}
@Injectable()
export class SalesReturnsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.salesReturns, 'SalesReturn', audit, 'returnNumber'); }
}
@Injectable()
export class CustomerPriceListService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.customerPriceList, 'CustomerPrice', audit); }
}
@Injectable()
export class SalesApprovalsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.salesApprovals, 'SalesApproval', audit); }
}
@Injectable()
export class SalesSettingsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.salesSettings, 'SalesSettings', audit); }
}
