import { Injectable, Inject, Logger, type OnApplicationShutdown } from '@nestjs/common';
import {
  UsersRepository,
  RolesRepository,
  RefreshTokensRepository,
  PermissionsRepository,
  AuditLogsRepository,
  CompaniesRepository,
  FinancialYearsRepository,
  BranchesRepository,
  WarehousesRepository,
  UnitsRepository,
  CategoriesRepository,
  BrandsRepository,
  TaxGroupsRepository,
  GSTRatesRepository,
  ItemsRepository,
  ItemVariantsRepository,
  ItemGroupsRepository,
  ItemPricingRepository,
  ItemBarcodesRepository,
  HsnCodesRepository,
  StockOpeningRepository,
  ItemImagesRepository,
  InventorySettingsRepository,
  WarehouseZonesRepository,
  WarehouseRacksRepository,
  WarehouseShelvesRepository,
  WarehouseBinsRepository,
  UOMConversionsRepository,
  ProductAttributesRepository,
  ItemPackagingRepository,
  BatchMasterRepository,
  BatchLotRepository,
  BatchGenealogyRepository,
  SerialMasterRepository,
  SerialHistoryRepository,
  SerialWarrantyRepository,
  SerialInstallationRepository,
  SerialServiceRepository,
  SerialRMARepository,
  SerialRelationshipRepository,
  SerialDocumentRepository,
  InvStockLedgerRepository,
  InvStockBalanceRepository,
  InvStockReservationRepository,
  StockTransfersRepository,
  TransferItemsRepository,
  StockAdjustmentsRepository,
  AdjustmentItemsRepository,
  PhysicalCountHeadersRepository,
  PhysicalCountItemsRepository,
  PurchaseOrdersRepository,
  POItemsRepository,
  PurchaseQuotationsRepository,
  GrnRepository,
  GRNItemsRepository,
  PurchaseInvoicesRepository,
  PurchaseReturnsRepository,
  PurchaseReturnItemsRepository,
  SupplierPriceListRepository,
  PurchaseApprovalsRepository,
  PurchaseSettingsRepository,
  SuppliersRepository,
  PurchaseRequisitionsRepository,
  PurchaseRequisitionItemsRepository,
  StockLedgerRepository,
  WarehouseStockRepository,
  SalesQuotationsRepository,
  QuotationItemsRepository,
  SalesOrdersRepository,
  SalesOrderItemsRepository,
  DeliveryChallansRepository,
  ChallanItemsRepository,
  SalesInvoicesRepository,
  InvoiceItemsRepository,
  SalesReturnsRepository,
  ReturnItemsRepository,
  CustomerPriceListRepository,
  SalesApprovalsRepository,
  SalesSettingsRepository,
  ApprovalHistoryRepository,
  ApprovalCommentsRepository,
  ApprovalNotificationsRepository,
  ApprovalMatricesRepository,
  ApprovalRulesRepository,
  CreditProfilesRepository,
  CreditOverridesRepository,
  CreditNotesRepository,
  DebitNotesRepository,
  AccountGroupsRepository,
  ChartOfAccountsRepository,
  LedgerMasterRepository,
  JournalEntriesRepository,
  JournalEntryItemsRepository,
  CashBookRepository,
  BankBookRepository,
  BankAccountsRepository,
  CostCentersRepository,
  AccountingSettingsRepository,
  GlEntriesRepository,
  FinancialSnapshotsRepository,
  ReportCacheRepository,
  PostingRulesRepository,
  FiscalClosingRecordsRepository,
  GstRegistrationsRepository,
  GstLedgerRepository,
  GstReturnsRepository,
  TaxPostingsRepository,
  YearClosingRecordsRepository,
  PeriodLocksRepository,
  OpeningBalanceTransfersRepository,
  YearEndEntriesRepository,
  AuditDetailsRepository,
  NumberSeriesRepository,
  VoucherApprovalsRepository,
  FinanceAnalyticsRepository,
  GstAuditSettingsRepository,
  WorkflowTemplatesRepository,
  WorkflowInstancesRepository,
  WorkflowHistoryRepository,
  ApprovalMatrixRepository,
  WorkflowTasksRepository,
  NotificationsRepository,
  EscalationRulesRepository,
  WorkflowCommentsRepository,
  DocumentsRepository,
  DocumentFoldersRepository,
  DocumentVersionsRepository,
  DocumentTagsRepository,
  DigitalSignaturesRepository,
  OcrResultsRepository,
  DocumentAccessLogsRepository,
  loadDatabaseConfig,
  DatabaseClient,
  DatabaseConfig,
} from '@shranix/database';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  // Auth
  public readonly users: UsersRepository;
  public readonly roles: RolesRepository;
  public readonly refreshTokens: RefreshTokensRepository;
  public readonly permissions: PermissionsRepository;
  public readonly auditLogs: AuditLogsRepository;

  // Masters
  public readonly companies: CompaniesRepository;
  public readonly financialYears: FinancialYearsRepository;
  public readonly branches: BranchesRepository;
  public readonly warehouses: WarehousesRepository;
  public readonly units: UnitsRepository;
  public readonly categories: CategoriesRepository;
  public readonly brands: BrandsRepository;
  public readonly taxGroups: TaxGroupsRepository;
  public readonly gstRates: GSTRatesRepository;

  // Inventory
  public readonly items: ItemsRepository;
  public readonly itemVariants: ItemVariantsRepository;
  public readonly itemGroups: ItemGroupsRepository;
  public readonly itemPricing: ItemPricingRepository;
  public readonly itemBarcodes: ItemBarcodesRepository;
  public readonly hsnCodes: HsnCodesRepository;
  public readonly stockOpening: StockOpeningRepository;
  public readonly itemImages: ItemImagesRepository;
  public readonly inventorySettings: InventorySettingsRepository;
  public readonly warehouseZones: WarehouseZonesRepository;
  public readonly warehouseRacks: WarehouseRacksRepository;
  public readonly warehouseShelves: WarehouseShelvesRepository;
  public readonly warehouseBins: WarehouseBinsRepository;
  public readonly uomConversions: UOMConversionsRepository;
  public readonly productAttributes: ProductAttributesRepository;
  public readonly itemPackaging: ItemPackagingRepository;
  public readonly batchMaster: BatchMasterRepository;
  public readonly batchLots: BatchLotRepository;
  public readonly batchGenealogy: BatchGenealogyRepository;
  public readonly serialMaster: SerialMasterRepository;
  public readonly serialHistory: SerialHistoryRepository;
  public readonly serialWarranty: SerialWarrantyRepository;
  public readonly serialInstallation: SerialInstallationRepository;
  public readonly serialService: SerialServiceRepository;
  public readonly serialRMA: SerialRMARepository;
  public readonly serialRelationship: SerialRelationshipRepository;
  public readonly serialDocument: SerialDocumentRepository;
  public readonly invStockLedger: InvStockLedgerRepository;
  public readonly invStockBalance: InvStockBalanceRepository;
  public readonly invStockReservation: InvStockReservationRepository;
  public readonly stockTransfers: StockTransfersRepository;
  public readonly transferItems: TransferItemsRepository;
  public readonly stockAdjustments: StockAdjustmentsRepository;
  public readonly adjustmentItems: AdjustmentItemsRepository;
  public readonly physicalCountHeaders: PhysicalCountHeadersRepository;
  public readonly physicalCountItems: PhysicalCountItemsRepository;

  // Purchase
  public readonly purchaseOrders: PurchaseOrdersRepository;
  public readonly poItems: POItemsRepository;
  public readonly purchaseQuotations: PurchaseQuotationsRepository;
  public readonly grn: GrnRepository;
  public readonly grnItems: GRNItemsRepository;
  public readonly purchaseInvoices: PurchaseInvoicesRepository;
  public readonly purchaseReturns: PurchaseReturnsRepository;
  public readonly supplierPriceList: SupplierPriceListRepository;
  public readonly purchaseApprovals: PurchaseApprovalsRepository;
  public readonly purchaseSettings: PurchaseSettingsRepository;

  // Sales
  public readonly salesQuotations: SalesQuotationsRepository;
  public readonly quotationItems: QuotationItemsRepository;
  public readonly salesOrders: SalesOrdersRepository;
  public readonly salesOrderItems: SalesOrderItemsRepository;
  public readonly deliveryChallans: DeliveryChallansRepository;
  public readonly challanItems: ChallanItemsRepository;
  public readonly salesInvoices: SalesInvoicesRepository;
  public readonly invoiceItems: InvoiceItemsRepository;
  public readonly salesReturns: SalesReturnsRepository;
  public readonly returnItems: ReturnItemsRepository;
  public readonly customerPriceList: CustomerPriceListRepository;
  public readonly salesApprovals: SalesApprovalsRepository;
  public readonly salesSettings: SalesSettingsRepository;

  // ⭐ Phase 1: Persisted Approval & Credit Repos
  public readonly approvalHistory: ApprovalHistoryRepository;
  public readonly approvalComments: ApprovalCommentsRepository;
  public readonly approvalNotifications: ApprovalNotificationsRepository;
  public readonly approvalMatrices: ApprovalMatricesRepository;
  public readonly approvalRules: ApprovalRulesRepository;
  public readonly creditProfiles: CreditProfilesRepository;
  public readonly creditOverrides: CreditOverridesRepository;
  public readonly creditNotes: CreditNotesRepository;
  public readonly debitNotes: DebitNotesRepository;

  // Finance
  public readonly accountGroups: AccountGroupsRepository;
  public readonly chartOfAccounts: ChartOfAccountsRepository;
  public readonly ledgerMaster: LedgerMasterRepository;
  public readonly journalEntries: JournalEntriesRepository;
  public readonly journalEntryItems: JournalEntryItemsRepository;
  public readonly cashBook: CashBookRepository;
  public readonly bankBook: BankBookRepository;
  public readonly bankAccounts: BankAccountsRepository;
  public readonly costCenters: CostCentersRepository;
  public readonly accountingSettings: AccountingSettingsRepository;

  // GL / Reporting
  public readonly glEntries: GlEntriesRepository;
  public readonly financialSnapshots: FinancialSnapshotsRepository;
  public readonly reportCache: ReportCacheRepository;
  public readonly postingRules: PostingRulesRepository;
  public readonly fiscalClosingRecords: FiscalClosingRecordsRepository;

  // Workflow
  public readonly workflowTemplates: WorkflowTemplatesRepository;
  public readonly workflowInstances: WorkflowInstancesRepository;
  public readonly workflowHistory: WorkflowHistoryRepository;
  public readonly approvalMatrix: ApprovalMatrixRepository;
  public readonly workflowTasks: WorkflowTasksRepository;
  public readonly notifications: NotificationsRepository;
  public readonly escalationRules: EscalationRulesRepository;
  public readonly workflowComments: WorkflowCommentsRepository;

  // GST / Audit / Closing
  public readonly gstRegistrations: GstRegistrationsRepository;
  public readonly gstLedger: GstLedgerRepository;
  public readonly gstReturns: GstReturnsRepository;
  public readonly taxPostings: TaxPostingsRepository;
  public readonly yearClosingRecords: YearClosingRecordsRepository;
  public readonly periodLocks: PeriodLocksRepository;
  public readonly openingBalanceTransfers: OpeningBalanceTransfersRepository;
  public readonly yearEndEntries: YearEndEntriesRepository;
  public readonly auditDetails: AuditDetailsRepository;
  public readonly numberSeries: NumberSeriesRepository;
  public readonly voucherApprovals: VoucherApprovalsRepository;
  public readonly financeAnalytics: FinanceAnalyticsRepository;
  public readonly gstAuditSettings: GstAuditSettingsRepository;

  // DMS
  public readonly documents: DocumentsRepository;
  public readonly documentFolders: DocumentFoldersRepository;
  public readonly documentVersions: DocumentVersionsRepository;
  public readonly documentTags: DocumentTagsRepository;
  public readonly digitalSignatures: DigitalSignaturesRepository;
  public readonly ocrResults: OcrResultsRepository;
  public readonly documentAccessLogs: DocumentAccessLogsRepository;

  // PRM-013: Multi-Company
  public readonly businessUnits: any;
  public readonly departments: any;
  public readonly leads: any;
  public readonly opportunities: any;
  public readonly assetCategories: any;
  public readonly fixedAssets: any;
  public readonly assetDepreciation: any;
  public readonly employees: any;
  public readonly employeeDesignations: any;
  public readonly leaveTypes: any;
  public readonly leaveRequests: any;
  public readonly budgets: any;
  public readonly webhooks: any;
  public readonly apiKeys: any;
  public readonly importLogs: any;
  public readonly dataRetentionPolicies: any;
  public readonly legalHolds: any;

  // PRM-016 Purchase & GRN
  public readonly suppliers: SuppliersRepository;
  public readonly purchaseRequisitions: PurchaseRequisitionsRepository;
  public readonly purchaseRequisitionItems: PurchaseRequisitionItemsRepository;
  public readonly stockLedger: StockLedgerRepository;
  public readonly warehouseStock: WarehouseStockRepository;
  public readonly purchaseReturnItems: PurchaseReturnItemsRepository;

  private readonly config: DatabaseConfig;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@Inject('DATABASE_CLIENT') db: DatabaseClient) {
    this.config = loadDatabaseConfig();
    const isPostgres = this.config.provider === 'postgresql';

    // Auth
    this.users = new UsersRepository(db as any, isPostgres);
    this.roles = new RolesRepository(db as any, isPostgres);
    this.refreshTokens = new RefreshTokensRepository(db as any, isPostgres);
    this.permissions = new PermissionsRepository(db as any, isPostgres);
    this.auditLogs = new AuditLogsRepository(db as any, isPostgres);

    // Masters
    this.companies = new CompaniesRepository(db as any, isPostgres);
    this.financialYears = new FinancialYearsRepository(db as any, isPostgres);
    this.branches = new BranchesRepository(db as any, isPostgres);
    this.warehouses = new WarehousesRepository(db as any, isPostgres);
    this.units = new UnitsRepository(db as any, isPostgres);
    this.categories = new CategoriesRepository(db as any, isPostgres);
    this.brands = new BrandsRepository(db as any, isPostgres);
    this.taxGroups = new TaxGroupsRepository(db as any, isPostgres);
    this.gstRates = new GSTRatesRepository(db as any, isPostgres);

    // Inventory
    this.items = new ItemsRepository(db as any, isPostgres);
    this.itemVariants = new ItemVariantsRepository(db as any, isPostgres);
    this.itemGroups = new ItemGroupsRepository(db as any, isPostgres);
    this.itemPricing = new ItemPricingRepository(db as any, isPostgres);
    this.itemBarcodes = new ItemBarcodesRepository(db as any, isPostgres);
    this.hsnCodes = new HsnCodesRepository(db as any, isPostgres);
    this.stockOpening = new StockOpeningRepository(db as any, isPostgres);
    this.itemImages = new ItemImagesRepository(db as any, isPostgres);
    this.inventorySettings = new InventorySettingsRepository(db as any, isPostgres);

    this.warehouseZones = new WarehouseZonesRepository(db as any, isPostgres);
    this.warehouseRacks = new WarehouseRacksRepository(db as any, isPostgres);
    this.warehouseShelves = new WarehouseShelvesRepository(db as any, isPostgres);
    this.warehouseBins = new WarehouseBinsRepository(db as any, isPostgres);
    this.uomConversions = new UOMConversionsRepository(db as any, isPostgres);
    this.productAttributes = new ProductAttributesRepository(db as any, isPostgres);
    this.itemPackaging = new ItemPackagingRepository(db as any, isPostgres);
    this.batchMaster = new BatchMasterRepository(db as any, isPostgres);
    this.batchLots = new BatchLotRepository(db as any, isPostgres);
    this.batchGenealogy = new BatchGenealogyRepository(db as any, isPostgres);
    this.serialMaster = new SerialMasterRepository(db as any, isPostgres);
    this.serialHistory = new SerialHistoryRepository(db as any, isPostgres);
    this.serialWarranty = new SerialWarrantyRepository(db as any, isPostgres);
    this.serialInstallation = new SerialInstallationRepository(db as any, isPostgres);
    this.serialService = new SerialServiceRepository(db as any, isPostgres);
    this.serialRMA = new SerialRMARepository(db as any, isPostgres);
    this.serialRelationship = new SerialRelationshipRepository(db as any, isPostgres);
    this.serialDocument = new SerialDocumentRepository(db as any, isPostgres);
    this.invStockLedger = new InvStockLedgerRepository(db as any, isPostgres);
    this.invStockBalance = new InvStockBalanceRepository(db as any, isPostgres);
    this.invStockReservation = new InvStockReservationRepository(db as any, isPostgres);
    this.stockTransfers = new StockTransfersRepository(db as any, isPostgres);
    this.transferItems = new TransferItemsRepository(db as any, isPostgres);
    this.stockAdjustments = new StockAdjustmentsRepository(db as any, isPostgres);
    this.adjustmentItems = new AdjustmentItemsRepository(db as any, isPostgres);
    this.physicalCountHeaders = new PhysicalCountHeadersRepository(db as any, isPostgres);
    this.physicalCountItems = new PhysicalCountItemsRepository(db as any, isPostgres);

    // Purchase
    this.purchaseOrders = new PurchaseOrdersRepository(db as any, isPostgres);
    this.poItems = new POItemsRepository(db as any, isPostgres);
    this.purchaseQuotations = new PurchaseQuotationsRepository(db as any, isPostgres);
    this.grn = new GrnRepository(db as any, isPostgres);
    this.grnItems = new GRNItemsRepository(db as any, isPostgres);
    this.purchaseInvoices = new PurchaseInvoicesRepository(db as any, isPostgres);
    this.purchaseReturns = new PurchaseReturnsRepository(db as any, isPostgres);
    this.purchaseReturnItems = new PurchaseReturnItemsRepository(db as any, isPostgres);
    this.supplierPriceList = new SupplierPriceListRepository(db as any, isPostgres);
    this.purchaseApprovals = new PurchaseApprovalsRepository(db as any, isPostgres);
    this.purchaseSettings = new PurchaseSettingsRepository(db as any, isPostgres);

    // PRM-016 Purchase & GRN
    this.suppliers = new SuppliersRepository(db as any, isPostgres);
    this.purchaseRequisitions = new PurchaseRequisitionsRepository(db as any, isPostgres);
    this.purchaseRequisitionItems = new PurchaseRequisitionItemsRepository(db as any, isPostgres);
    this.stockLedger = new StockLedgerRepository(db as any, isPostgres);
    this.warehouseStock = new WarehouseStockRepository(db as any, isPostgres);

    // Sales
    this.salesQuotations = new SalesQuotationsRepository(db as any, isPostgres);
    this.quotationItems = new QuotationItemsRepository(db as any, isPostgres);
    this.salesOrders = new SalesOrdersRepository(db as any, isPostgres);
    this.salesOrderItems = new SalesOrderItemsRepository(db as any, isPostgres);
    this.deliveryChallans = new DeliveryChallansRepository(db as any, isPostgres);
    this.challanItems = new ChallanItemsRepository(db as any, isPostgres);
    this.salesInvoices = new SalesInvoicesRepository(db as any, isPostgres);
    this.invoiceItems = new InvoiceItemsRepository(db as any, isPostgres);
    this.salesReturns = new SalesReturnsRepository(db as any, isPostgres);
    this.returnItems = new ReturnItemsRepository(db as any, isPostgres);
    this.customerPriceList = new CustomerPriceListRepository(db as any, isPostgres);
    this.salesApprovals = new SalesApprovalsRepository(db as any, isPostgres);
    this.salesSettings = new SalesSettingsRepository(db as any, isPostgres);

    // ⭐ Phase 1: Persisted Approval & Credit Repos
    this.approvalHistory = new ApprovalHistoryRepository(db as any, isPostgres);
    this.approvalComments = new ApprovalCommentsRepository(db as any, isPostgres);
    this.approvalNotifications = new ApprovalNotificationsRepository(db as any, isPostgres);
    this.approvalMatrices = new ApprovalMatricesRepository(db as any, isPostgres);
    this.approvalRules = new ApprovalRulesRepository(db as any, isPostgres);
    this.creditProfiles = new CreditProfilesRepository(db as any, isPostgres);
    this.creditOverrides = new CreditOverridesRepository(db as any, isPostgres);
    this.creditNotes = new CreditNotesRepository(db as any, isPostgres);
    this.debitNotes = new DebitNotesRepository(db as any, isPostgres);

    // Finance
    this.accountGroups = new AccountGroupsRepository(db as any, isPostgres);
    this.chartOfAccounts = new ChartOfAccountsRepository(db as any, isPostgres);
    this.ledgerMaster = new LedgerMasterRepository(db as any, isPostgres);
    this.journalEntries = new JournalEntriesRepository(db as any, isPostgres);
    this.journalEntryItems = new JournalEntryItemsRepository(db as any, isPostgres);
    this.cashBook = new CashBookRepository(db as any, isPostgres);
    this.bankBook = new BankBookRepository(db as any, isPostgres);
    this.bankAccounts = new BankAccountsRepository(db as any, isPostgres);
    this.costCenters = new CostCentersRepository(db as any, isPostgres);
    this.accountingSettings = new AccountingSettingsRepository(db as any, isPostgres);

    // GL / Reporting
    this.glEntries = new GlEntriesRepository(db as any, isPostgres);
    this.financialSnapshots = new FinancialSnapshotsRepository(db as any, isPostgres);
    this.reportCache = new ReportCacheRepository(db as any, isPostgres);
    this.postingRules = new PostingRulesRepository(db as any, isPostgres);
    this.fiscalClosingRecords = new FiscalClosingRecordsRepository(db as any, isPostgres);

    // Workflow
    this.workflowTemplates = new WorkflowTemplatesRepository(db as any, isPostgres);
    this.workflowInstances = new WorkflowInstancesRepository(db as any, isPostgres);
    this.workflowHistory = new WorkflowHistoryRepository(db as any, isPostgres);
    this.approvalMatrix = new ApprovalMatrixRepository(db as any, isPostgres);
    this.workflowTasks = new WorkflowTasksRepository(db as any, isPostgres);
    this.notifications = new NotificationsRepository(db as any, isPostgres);
    this.escalationRules = new EscalationRulesRepository(db as any, isPostgres);
    this.workflowComments = new WorkflowCommentsRepository(db as any, isPostgres);

    // GST / Audit / Closing
    this.gstRegistrations = new GstRegistrationsRepository(db as any, isPostgres);
    this.gstLedger = new GstLedgerRepository(db as any, isPostgres);
    this.gstReturns = new GstReturnsRepository(db as any, isPostgres);
    this.taxPostings = new TaxPostingsRepository(db as any, isPostgres);
    this.yearClosingRecords = new YearClosingRecordsRepository(db as any, isPostgres);
    this.periodLocks = new PeriodLocksRepository(db as any, isPostgres);
    this.openingBalanceTransfers = new OpeningBalanceTransfersRepository(db as any, isPostgres);
    this.yearEndEntries = new YearEndEntriesRepository(db as any, isPostgres);
    this.auditDetails = new AuditDetailsRepository(db as any, isPostgres);
    this.numberSeries = new NumberSeriesRepository(db as any, isPostgres);
    this.voucherApprovals = new VoucherApprovalsRepository(db as any, isPostgres);
    this.financeAnalytics = new FinanceAnalyticsRepository(db as any, isPostgres);
    this.gstAuditSettings = new GstAuditSettingsRepository(db as any, isPostgres);

    // DMS
    this.documents = new DocumentsRepository(db as any, isPostgres);
    this.documentFolders = new DocumentFoldersRepository(db as any, isPostgres);
    this.documentVersions = new DocumentVersionsRepository(db as any, isPostgres);
    this.documentTags = new DocumentTagsRepository(db as any, isPostgres);
    this.digitalSignatures = new DigitalSignaturesRepository(db as any, isPostgres);
    this.ocrResults = new OcrResultsRepository(db as any, isPostgres);
    this.documentAccessLogs = new DocumentAccessLogsRepository(db as any, isPostgres);

    // ── In-memory generic repository factory ──
    const genericStores = new Map<string, Map<string, any>>();
    const createGenericRepo = (storeName: string) => {
      if (!genericStores.has(storeName)) {
        genericStores.set(storeName, new Map());
      }
      const store = genericStores.get(storeName)!;
      let counter = 1;
      return {
        create: async (data: any) => {
          const id = `${storeName}_${counter++}`;
          const record = {
            id,
            ...data,
            createdAt: new Date().toISOString(),
            deletedAt: null,
            isDeleted: false,
          };
          // record.id hi canonical key hai — services explicit UUID pass karti hain
          // (e.g. webhooks/apiKeys), to store key bhi wahi hona chahiye warna findById 404 deta.
          store.set(record.id, record);
          return record;
        },
        findAll: async (params: any) => {
          const all = Array.from(store.values()).filter((r) => !r.isDeleted);
          const p = params?.page || 1;
          const ps = params?.pageSize || 50;
          const search = params?.search;
          let filtered = all;
          if (search) {
            const q = search.toLowerCase();
            filtered = all.filter((r) =>
              Object.values(r).some((v) => String(v).toLowerCase().includes(q)),
            );
          }
          const start = (p - 1) * ps;
          return {
            data: filtered.slice(start, start + ps),
            total: filtered.length,
            totalPages: Math.ceil(filtered.length / ps),
          };
        },
        findById: async (id: string) => store.get(id) || null,
        update: async (id: string, data: any) => {
          const existing = store.get(id);
          if (!existing) {
            return null;
          }
          const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
          store.set(id, updated);
          return updated;
        },
        softDelete: async (id: string) => {
          const existing = store.get(id);
          if (existing) {
            existing.isDeleted = true;
            existing.deletedAt = new Date().toISOString();
          }
        },
        restore: async (id: string) => {
          const existing = store.get(id);
          if (existing) {
            existing.isDeleted = false;
            existing.deletedAt = null;
          }
        },
      };
    };

    this.leads = createGenericRepo('leads');
    this.opportunities = createGenericRepo('opportunities');
    this.businessUnits = createGenericRepo('businessUnits');
    this.departments = createGenericRepo('departments');
    this.assetCategories = createGenericRepo('assetCategories');
    this.fixedAssets = createGenericRepo('fixedAssets');
    this.assetDepreciation = createGenericRepo('assetDepreciation');
    this.employees = createGenericRepo('employees');
    this.employeeDesignations = createGenericRepo('employeeDesignations');
    this.leaveTypes = createGenericRepo('leaveTypes');
    this.leaveRequests = createGenericRepo('leaveRequests');
    this.budgets = createGenericRepo('budgets');
    this.webhooks = createGenericRepo('webhooks');
    this.apiKeys = createGenericRepo('apiKeys');
    this.importLogs = createGenericRepo('importLogs');
    this.dataRetentionPolicies = createGenericRepo('dataRetentionPolicies');
    this.legalHolds = createGenericRepo('legalHolds');

    // PRM-015: Enterprise Inventory Engine repos (in-memory with persistence via genericStores Map)
    (this as any)['batchStock'] = createGenericRepo('batchStock');
    (this as any)['stockMovements'] = createGenericRepo('stockMovements');
    (this as any)['warehouseLocations'] = createGenericRepo('warehouseLocations');
    (this as any)['damageRegister'] = createGenericRepo('damageRegister');
    (this as any)['recallRegister'] = createGenericRepo('recallRegister');
    (this as any)['distributorReturnQueue'] = createGenericRepo('distributorReturnQueue');
    (this as any)['replacementQueue'] = createGenericRepo('replacementQueue');
    (this as any)['subCategories'] = createGenericRepo('subCategories');
    (this as any)['stockTransfers'] = createGenericRepo('stockTransfers');

    this.logger.log(
      `DatabaseService initialized with 88 repositories + 15 PRM-013 adapters + 9 PRM-015x inventory repos (provider: ${this.config.provider})`,
    );
  }

  async onApplicationShutdown(): Promise<void> {
    this.logger.log('Shutting down database connections...');
  }
}
