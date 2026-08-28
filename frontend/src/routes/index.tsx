import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';

import { ActivationGate } from '@/components/activation-gate';
import { LoadingScreen } from '@/components/loading-screen';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/context/AuthContext';
import { PortalAuthProvider } from '@/context/PortalAuthContext';
import { AppLayout } from '@/layouts/app-layout';
import { PortalLayout } from '@/layouts/portal-layout';
import { getUserLandingPath, hasModuleAccess } from '@/lib/module-access';
import { ActivationPage } from '@/pages/activation/activate';
import { PortalAdminPage } from '@/pages/portal/admin';
import { PortalDashboardPage } from '@/pages/portal/dashboard';
import { PortalDocumentsPage } from '@/pages/portal/documents';
import { PortalInvoicesPage, PortalInvoiceDetailPage } from '@/pages/portal/invoices';
import { PortalLedgerPage } from '@/pages/portal/ledger';
import { PortalLoginPage } from '@/pages/portal/login';
import { PortalOrdersPage, PortalOrderDetailPage } from '@/pages/portal/orders';
import { PortalOutstandingPage } from '@/pages/portal/outstanding';
import { PortalProfilePage } from '@/pages/portal/profile';
import { PortalQuotationsPage, PortalQuotationDetailPage } from '@/pages/portal/quotations';
import { PortalTicketsPage, PortalTicketDetailPage } from '@/pages/portal/tickets';

// Portal routes are wrapped in their own auth provider — the customer portal
// session is completely separate from the internal ERP session.
function PortalRoutes() {
  return (
    <PortalAuthProvider>
      <PortalLayout />
    </PortalAuthProvider>
  );
}
import { AccessDeniedPage } from '@/pages/auth/access-denied';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password';
import { LoginPage } from '@/pages/auth/login';
import { RegisterPage } from '@/pages/auth/register';
import { SessionExpiredPage } from '@/pages/auth/session-expired';
import { SetupWizardPage } from '@/pages/auth/setup-wizard';
import {
  CreateCustomerPage,
  CustomerDashboardPage,
  CustomerDetailPage,
  CustomerDocumentsPage,
  CustomersPage,
  EditCustomerPage,
  OutstandingPage,
} from '@/pages/customers';
import { DashboardPage } from '@/pages/dashboard';
import {
  DocumentListPage,
  DocumentFoldersPage,
  DocumentTagsPage,
  OcrQueuePage,
  DigitalSignaturesPage,
  DocumentCompliancePage,
} from '@/pages/dms';
import { ErrorPage } from '@/pages/error-page';
import {
  AccountGroupsPage,
  ChartOfAccountsPage,
  LedgerMasterPage,
  JournalEntriesPage,
  CashBookPage,
  BankBookPage,
  CostCentersPage,
  AccountingSettingsPage,
  FinanceDashboardPage,
} from '@/pages/finance';
import {
  CreateAccountGroupPage,
  CreateChartOfAccountPage,
  CreateLedgerPage,
  CreateJournalEntryPage,
  CreateCostCenterPage,
} from '@/pages/finance/dynamic-forms';
import {
  GlEntriesPage,
  PostingRulesPage,
  FiscalClosingPage,
  TrialBalancePage,
  ProfitLossPage,
  BalanceSheetPage,
  CashFlowPage,
  DayBookPage,
  AccountStatementPage,
  FinancialDashboardPage,
} from '@/pages/gl';
import {
  CreateGlEntryPage,
  CreatePostingRulePage,
  CreateFiscalClosingPage,
} from '@/pages/gl/dynamic-forms';
import {
  GstRegistrationsPage,
  GstLedgerPage,
  GstReturnsPage,
  TaxPostingsPage,
  YearClosingPage,
  PeriodLocksPage,
  OpeningBalanceTransfersPage,
  YearEndEntriesPage,
  AuditDetailsPage,
  NumberSeriesPage,
  VoucherApprovalsPage,
  GstAuditSettingsPage,
} from '@/pages/gst_audit';
import {
  CreateGstRegistrationPage,
  CreateTaxPostingPage,
  CreateNumberSeriesPage,
  CreateGstAuditSettingsPage,
} from '@/pages/gst_audit/dynamic-forms';
import {
  ItemsPage,
  ItemGroupsPage,
  ItemVariantsPage,
  ItemPricingPage,
  ItemBarcodesPage,
  HsnCodesPage,
  StockOpeningPage,
  ItemImagesPage,
  InventorySettingsPage,
  BatchesPage,
  StockMovementsPage,
  WarehouseLocationsPage,
  NearExpiryPage,
  DamageRegisterPage,
  RecallRegisterPage,
  DistributorReturnsPage,
  ReplacementQueuePage,
  InventorySummaryPage,
  StockLedgerPage,
  BatchLedgerPage,
  ExpiryReportPage,
  MovementReportPage,
  ValuationReportPage,
  DeadStockPage,
  FastMovingPage,
  SlowMovingPage,
  BarcodeGenPage,
  ProductsPage,
  CreateProductPage,
  EditProductPage,
  ProductDetailPage,
  SubCategoriesPage,
  NewStockEntryPage,
  StockAdjustmentPage,
  StockLedgerEnhancedPage,
  LocationTreePage,
  StockTransfersPage,
  CreateTransferPage,
  StockReservationPage,
  WarehouseReportsPage,
} from '@/pages/inventory';
import {
  CreateItemGroupPage,
  CreateSubCategoryPage,
  CreateItemVariantPage,
  CreateItemPricingPage,
  CreateItemBarcodePage,
  CreateHsnCodePage,
  CreateStockOpeningPage,
  CreateItemImagePage,
  CreateInventorySettingsPage,
} from '@/pages/inventory/dynamic-forms';
import {
  CompaniesPage,
  FinancialYearsPage,
  BranchesPage,
  WarehousesPage,
  UnitsPage,
  CategoriesPage,
  BrandsPage,
  TaxGroupsPage,
  GSTRatesPage,
  CreateCompanyPage,
  EditCompanyPage,
  CreateFinancialYearPage,
  EditFinancialYearPage,
  CreateBranchPage,
  EditBranchPage,
  CreateWarehousePage,
  EditWarehousePage,
  CreateUnitPage,
  EditUnitPage,
  CreateCategoryPage,
  EditCategoryPage,
  CreateBrandPage,
  EditBrandPage,
  CreateTaxGroupPage,
  EditTaxGroupPage,
  CreateGstRatePage,
  EditGstRatePage,
} from '@/pages/masters';
import { NotFoundPage } from '@/pages/not-found-page';
import {
  ProductDashboardPage as MasterProductDashboardPage,
  ProductsListPage as MasterProductsListPage,
  CreateProductPage as MasterCreateProductPage,
  EditProductPage as MasterEditProductPage,
  ProductDetailPage as MasterProductDetailPage,
  ProductReportsPage as MasterProductReportsPage,
} from '@/pages/products';
import {
  PurchaseOrdersPage,
  PurchaseQuotationsPage,
  GrnPage,
  PurchaseInvoicesPage,
  PurchaseReturnsPage,
  SupplierPriceListPage,
  PurchaseApprovalsPage,
  PurchaseSettingsPage,
  PurchaseRequisitionsPage,
  PurchaseRegisterReport,
  GrnRegisterReport,
  PendingPOReport,
  PurchaseReturnReport,
  GstPurchaseReport,
  PurchaseDashboardPage,
} from '@/pages/purchase';
import { CreatePurchaseSettingsPage } from '@/pages/purchase/dynamic-forms';
import { PurchasePaymentCollectionPage } from '@/pages/purchase/payment-collection-page';
import {
  SalesQuotationsPage,
  SalesOrdersPage,
  DeliveryChallansPage,
  SalesInvoicesPage,
  SimpleInvoicePage,
  SalesReturnsPage,
  CustomerPriceListPage,
  SalesApprovalsPage,
  SalesSettingsPage,
} from '@/pages/sales';
import { ApprovalsPage, ApprovalDashboard, ApprovalSettings } from '@/pages/sales/approvals';
import {
  CreditDashboardPage,
  CreditCustomersPage,
  AgeingReportPage,
  RecoveryDashboardPage,
  CreditHoldDashboardPage,
  ReminderEnginePage,
} from '@/pages/sales/credit';
import { CustomerLedgerPage } from '@/pages/sales/customer-ledger-page';
import { DeliveryChallanFormPage } from '@/pages/sales/delivery-challan-form-page';
import { CreateSalesSettingsPage } from '@/pages/sales/dynamic-forms';
import { PaymentCollectionPage } from '@/pages/sales/payment-collection-page';
import { SalesQuotationFormPage } from '@/pages/sales/quotation-form-page';
import {
  QuotationDashboardPage,
  SalesReportsDashboardPage,
  SalesRegisterReport,
  InvoiceRegisterReport,
  CustomerLedgerReport,
  ProductSalesReport,
  OutstandingReport,
  GstReport,
  PaymentReport,
  ProfitAnalysisReport,
  ExportCenter,
} from '@/pages/sales/reports';
import {
  CreateReturnPage,
  CreditNotesPage,
  DebitNotesPage,
  ReturnReportsPage,
} from '@/pages/sales/returns';
import {
  OverviewAnalyticsPage,
  SalesAnalyticsPage,
  PurchaseAnalyticsPage,
  InventoryAnalyticsPage,
  FinanceAnalyticsPage,
  GstAnalyticsPage,
  CustomerAnalyticsPage,
  SupplierAnalyticsPage,
  WarehouseAnalyticsPage,
  ProfitabilityAnalyticsPage,
  CashFlowAnalyticsPage,
  GrowthAnalyticsPage,
  TopBottomAnalyticsPage,
} from '@/pages/bi-dashboards';
import { SalesOrderFormPage } from '@/pages/sales/sales-order-form-page';
import { CrmDashboardPage, CrmReportsPage } from '@/pages/crm';
import { NotificationCenterPage } from '@/pages/communications/center';
import { AssetExpenseDashboardPage } from '@/pages/assets/dashboard';
import { AssetsPage } from '@/pages/assets';
import { AssetDetailPage } from '@/pages/assets/detail';
import { AssetFormPage } from '@/pages/assets/form';
import { ExpensesPage } from '@/pages/expenses';
import { ExpenseFormPage } from '@/pages/expenses/form';
import { BusinessRulesPage } from '@/pages/control/business-rules';
import { CustomFieldsPage } from '@/pages/control/custom-fields';
import { TagsPage } from '@/pages/control/tags';
import { GlobalSearchPage } from '@/pages/control/global-search';
import { BusinessControlPage } from '@/pages/control/business-control';
import { CommercialDashboardPage } from '@/pages/commercial/dashboard';
import { CommercialPlansPage } from '@/pages/commercial/plans';
import { CommercialSubscriptionsPage } from '@/pages/commercial/subscriptions';
import { CommercialCouponsPage } from '@/pages/commercial/coupons';
import { CommercialBillingPage } from '@/pages/commercial/billing';
import { LicenseDashboardPage } from '@/pages/license/dashboard';
import { LicensesPage } from '@/pages/license/licenses';
import { LicenseDetailPage } from '@/pages/license/license-detail';
import { PortalLicensePage } from '@/pages/portal/license';
import { CommercialReportsPage } from '@/pages/commercial/reports';
import { PortalBillingPage } from '@/pages/portal/billing';
import { AttendancePage } from '@/pages/hr/attendance';
import { HrDashboardPage } from '@/pages/hr/dashboard';
import { EmployeeDetailPage } from '@/pages/hr/employee-detail';
import { EmployeeFormPage } from '@/pages/hr/employee-form';
import { EmployeesPage } from '@/pages/hr/employees';
import { LeavePage } from '@/pages/hr/leave';
import { PayrollPage } from '@/pages/hr/payroll';
import { CommunicationLogPage } from '@/pages/communications/log';
import { CommunicationTemplatesPage } from '@/pages/communications/templates';
import { CommunicationSettingsPage } from '@/pages/communications/settings';
import { CrmTasksPage, FollowUpsPage } from '@/pages/crm/engagement';
import { LeadFormPage } from '@/pages/crm/lead-form';
import { LeadDetailPage } from '@/pages/crm/lead-detail';
import { LeadsPage } from '@/pages/crm/leads';
import { CrmPipelinePage } from '@/pages/crm/pipeline';
import {
  CreateSupplierPage,
  EditSupplierPage,
  SupplierDashboardPage,
  SupplierDetailPage,
  SupplierDocumentsPage,
  SupplierOutstandingPage,
  SuppliersPage,
} from '@/pages/suppliers';
import {
  ApprovalDashboardPage,
  PendingTasksDashboardPage,
  MyTasksDashboardPage,
  EscalationDashboardPage,
} from '@/pages/workflow';

// Restricted user (tick-based module access) ke liye landing gate:
// Dashboard module allowed nahi hai → pehla allowed module page dikhao.
function ModuleLandingRedirect() {
  const { user } = useAuth();
  if (hasModuleAccess(user, 'dashboard')) {
    return <DashboardPage />;
  }
  return <Navigate to={getUserLandingPath(user)} replace />;
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <ActivationGate>
          <AppLayout />
        </ActivationGate>
      </ProtectedRoute>
    ),
    errorElement: <ErrorPage />,
    hydrateFallbackElement: <LoadingScreen />,
    children: [
      {
        index: true,
        element: <ModuleLandingRedirect />,
      },
      // ── Master Data Modules ──────────────────────────
      // ── Master Data List Routes ────────────────────
      { path: 'companies', element: <CompaniesPage /> },
      { path: 'companies/create', element: <CreateCompanyPage /> },
      { path: 'companies/:id/edit', element: <EditCompanyPage /> },
      { path: 'financial-years', element: <FinancialYearsPage /> },
      { path: 'financial-years/create', element: <CreateFinancialYearPage /> },
      { path: 'financial-years/:id/edit', element: <EditFinancialYearPage /> },
      { path: 'branches', element: <BranchesPage /> },
      { path: 'branches/create', element: <CreateBranchPage /> },
      { path: 'branches/:id/edit', element: <EditBranchPage /> },
      { path: 'warehouses', element: <WarehousesPage /> },
      { path: 'warehouses/create', element: <CreateWarehousePage /> },
      { path: 'warehouses/:id/edit', element: <EditWarehousePage /> },
      { path: 'units', element: <UnitsPage /> },
      { path: 'units/create', element: <CreateUnitPage /> },
      { path: 'units/:id/edit', element: <EditUnitPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'categories/create', element: <CreateCategoryPage /> },
      { path: 'categories/:id/edit', element: <EditCategoryPage /> },
      { path: 'brands', element: <BrandsPage /> },
      { path: 'brands/create', element: <CreateBrandPage /> },
      { path: 'brands/:id/edit', element: <EditBrandPage /> },
      { path: 'tax-groups', element: <TaxGroupsPage /> },
      { path: 'tax-groups/create', element: <CreateTaxGroupPage /> },
      { path: 'tax-groups/:id/edit', element: <EditTaxGroupPage /> },
      { path: 'gst-rates', element: <GSTRatesPage /> },
      { path: 'gst-rates/create', element: <CreateGstRatePage /> },
      { path: 'gst-rates/:id/edit', element: <EditGstRatePage /> },
      // ── Inventory Modules ───────────────────────────
      // ── Product Master (Phase 3.2) ──────────────────
      { path: 'products', element: <MasterProductsListPage /> },
      { path: 'products/dashboard', element: <MasterProductDashboardPage /> },
      { path: 'products/reports', element: <MasterProductReportsPage /> },
      { path: 'products/create', element: <MasterCreateProductPage /> },
      { path: 'products/:id/edit', element: <MasterEditProductPage /> },
      { path: 'products/:id', element: <MasterProductDetailPage /> },
      { path: 'inventory/products', element: <ProductsPage /> },
      { path: 'inventory/products/create', element: <CreateProductPage /> },
      { path: 'inventory/products/:id/edit', element: <EditProductPage /> },
      { path: 'inventory/products/:id', element: <ProductDetailPage /> },
      { path: 'inventory/items', element: <ItemsPage /> },
      { path: 'inventory/items/create', element: <CreateProductPage /> },
      { path: 'inventory/items/:id/edit', element: <EditProductPage /> },
      { path: 'inventory/groups', element: <ItemGroupsPage /> },
      { path: 'inventory/groups/create', element: <CreateItemGroupPage /> },
      { path: 'inventory/groups/:id/edit', element: <CreateItemGroupPage /> },
      { path: 'inventory/variants', element: <ItemVariantsPage /> },
      { path: 'inventory/variants/create', element: <CreateItemVariantPage /> },
      { path: 'inventory/variants/:id/edit', element: <CreateItemVariantPage /> },
      { path: 'inventory/pricing', element: <ItemPricingPage /> },
      { path: 'inventory/pricing/create', element: <CreateItemPricingPage /> },
      { path: 'inventory/pricing/:id/edit', element: <CreateItemPricingPage /> },
      { path: 'inventory/barcodes', element: <ItemBarcodesPage /> },
      { path: 'inventory/barcodes/create', element: <CreateItemBarcodePage /> },
      { path: 'inventory/barcodes/:id/edit', element: <CreateItemBarcodePage /> },
      { path: 'inventory/hsn-codes', element: <HsnCodesPage /> },
      { path: 'inventory/hsn-codes/create', element: <CreateHsnCodePage /> },
      { path: 'inventory/hsn-codes/:id/edit', element: <CreateHsnCodePage /> },
      { path: 'inventory/stock-opening', element: <StockOpeningPage /> },
      { path: 'inventory/stock-opening/create', element: <CreateStockOpeningPage /> },
      { path: 'inventory/stock-opening/:id/edit', element: <CreateStockOpeningPage /> },
      { path: 'inventory/sub-categories', element: <SubCategoriesPage /> },
      { path: 'inventory/sub-categories/create', element: <CreateSubCategoryPage /> },
      { path: 'inventory/sub-categories/:id/edit', element: <CreateSubCategoryPage /> },
      { path: 'inventory/images', element: <ItemImagesPage /> },
      { path: 'inventory/images/create', element: <CreateItemImagePage /> },
      { path: 'inventory/images/:id/edit', element: <CreateItemImagePage /> },
      { path: 'inventory/settings', element: <InventorySettingsPage /> },
      { path: 'inventory/settings/create', element: <CreateInventorySettingsPage /> },
      { path: 'inventory/settings/:id/edit', element: <CreateInventorySettingsPage /> },
      // ── PRM-015: Enterprise Inventory Engine ────
      { path: 'inventory/batches', element: <BatchesPage /> },
      { path: 'inventory/stock-entry', element: <NewStockEntryPage /> },
      { path: 'inventory/stock-adjustment', element: <StockAdjustmentPage /> },
      { path: 'inventory/ledger', element: <StockLedgerEnhancedPage /> },
      { path: 'inventory/stock', element: <StockLedgerEnhancedPage /> },
      { path: 'inventory/stock-movements', element: <StockMovementsPage /> },
      { path: 'inventory/warehouse-dashboard', element: <Navigate to="/" replace /> },
      { path: 'inventory/warehouse-locations', element: <WarehouseLocationsPage /> },
      { path: 'inventory/location-tree', element: <LocationTreePage /> },
      { path: 'inventory/stock-transfers', element: <StockTransfersPage /> },
      { path: 'inventory/create-transfer', element: <CreateTransferPage /> },
      { path: 'inventory/stock-reservation', element: <StockReservationPage /> },
      { path: 'inventory/near-expiry', element: <NearExpiryPage /> },
      { path: 'inventory/damage-register', element: <DamageRegisterPage /> },
      { path: 'inventory/recall-register', element: <RecallRegisterPage /> },
      { path: 'inventory/distributor-returns', element: <DistributorReturnsPage /> },
      { path: 'inventory/replacement-queue', element: <ReplacementQueuePage /> },
      { path: 'inventory/reports/summary', element: <InventorySummaryPage /> },
      { path: 'inventory/reports/stock-ledger', element: <StockLedgerPage /> },
      { path: 'inventory/reports/batch-ledger', element: <BatchLedgerPage /> },
      { path: 'inventory/reports/expiry', element: <ExpiryReportPage /> },
      { path: 'inventory/reports/movement', element: <MovementReportPage /> },
      { path: 'inventory/reports/valuation', element: <ValuationReportPage /> },
      { path: 'inventory/reports/warehouse', element: <WarehouseReportsPage /> },
      { path: 'inventory/reports/dead-stock', element: <DeadStockPage /> },
      { path: 'inventory/reports/fast-moving', element: <FastMovingPage /> },
      { path: 'inventory/reports/slow-moving', element: <SlowMovingPage /> },
      { path: 'inventory/barcode-gen', element: <BarcodeGenPage /> },
      // ── Purchase Modules ────────────────────────────
      { path: 'purchase/dashboard', element: <PurchaseDashboardPage /> },
      { path: 'purchase/payments', element: <PurchasePaymentCollectionPage /> },
      { path: 'purchase/orders', element: <PurchaseOrdersPage /> },
      { path: 'purchase/quotations', element: <PurchaseQuotationsPage /> },
      { path: 'purchase/grn', element: <GrnPage /> },
      { path: 'purchase/invoices', element: <PurchaseInvoicesPage /> },
      { path: 'purchase/returns', element: <PurchaseReturnsPage /> },
      { path: 'purchase/supplier-prices', element: <SupplierPriceListPage /> },
      { path: 'purchase/approvals', element: <PurchaseApprovalsPage /> },
      { path: 'purchase/settings', element: <PurchaseSettingsPage /> },
      { path: 'purchase/settings/create', element: <CreatePurchaseSettingsPage /> },
      { path: 'purchase/settings/:id/edit', element: <CreatePurchaseSettingsPage /> },
      { path: 'suppliers', element: <SuppliersPage /> },
      { path: 'suppliers/dashboard', element: <SupplierDashboardPage /> },
      { path: 'suppliers/outstanding', element: <SupplierOutstandingPage /> },
      { path: 'suppliers/create', element: <CreateSupplierPage /> },
      { path: 'suppliers/:id/edit', element: <EditSupplierPage /> },
      { path: 'suppliers/:id/documents', element: <SupplierDocumentsPage /> },
      { path: 'suppliers/:id', element: <SupplierDetailPage /> },
      { path: 'purchase/requisitions', element: <PurchaseRequisitionsPage /> },
      { path: 'purchase/reports/purchase-register', element: <PurchaseRegisterReport /> },
      { path: 'purchase/reports/grn-register', element: <GrnRegisterReport /> },
      { path: 'purchase/reports/pending-pos', element: <PendingPOReport /> },
      { path: 'purchase/reports/purchase-returns', element: <PurchaseReturnReport /> },
      { path: 'purchase/reports/gst-purchase', element: <GstPurchaseReport /> },
      // ── Sales Modules ──────────────────────────────
      { path: 'sales/dashboard', element: <Navigate to="/" replace /> },
      { path: 'sales/quotations', element: <SalesQuotationsPage /> },
      { path: 'sales/quotations/dashboard', element: <QuotationDashboardPage /> },
      { path: 'sales/quotations/create', element: <SalesQuotationFormPage /> },
      { path: 'sales/quotations/:id/edit', element: <SalesQuotationFormPage /> },
      { path: 'sales/orders', element: <SalesOrdersPage /> },
      { path: 'sales/orders/create', element: <SalesOrderFormPage /> },
      { path: 'sales/orders/:id/edit', element: <SalesOrderFormPage /> },
      { path: 'sales/delivery-challans', element: <DeliveryChallansPage /> },
      { path: 'sales/delivery-challans/create', element: <DeliveryChallanFormPage /> },
      { path: 'sales/delivery-challans/:id/edit', element: <DeliveryChallanFormPage /> },
      { path: 'sales/invoices', element: <SalesInvoicesPage /> },
      { path: 'sales/invoices/create', element: <SimpleInvoicePage /> },
      { path: 'sales/returns', element: <SalesReturnsPage /> },
      { path: 'sales/customer-prices', element: <CustomerPriceListPage /> },
      { path: 'sales/approvals/legacy', element: <SalesApprovalsPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'customers/dashboard', element: <CustomerDashboardPage /> },
      { path: 'customers/outstanding', element: <OutstandingPage /> },
      { path: 'customers/create', element: <CreateCustomerPage /> },
      { path: 'customers/:id/edit', element: <EditCustomerPage /> },
      { path: 'customers/:id/documents', element: <CustomerDocumentsPage /> },
      { path: 'customers/:id', element: <CustomerDetailPage /> },
      { path: 'sales/settings', element: <SalesSettingsPage /> },
      { path: 'sales/settings/create', element: <CreateSalesSettingsPage /> },
      { path: 'sales/settings/:id/edit', element: <CreateSalesSettingsPage /> },
      // ── Sales Payment Collection (Phase 4) ──────
      { path: 'sales/payments', element: <PaymentCollectionPage /> },
      // ── Customer Ledger 360° (Phase 5) ───────────
      { path: 'sales/customer-ledger', element: <CustomerLedgerPage /> },
      // ── Sales Reports ────────────────────────────
      { path: 'sales/reports/dashboard', element: <SalesReportsDashboardPage /> },
      { path: 'sales/reports/register', element: <SalesRegisterReport /> },
      { path: 'sales/reports/invoices', element: <InvoiceRegisterReport /> },
      { path: 'sales/reports/customer-ledger', element: <CustomerLedgerReport /> },
      { path: 'sales/reports/products', element: <ProductSalesReport /> },
      { path: 'sales/reports/outstanding', element: <OutstandingReport /> },
      { path: 'sales/reports/gst', element: <GstReport /> },
      { path: 'sales/reports/payment', element: <PaymentReport /> },
      { path: 'sales/reports/profit', element: <ProfitAnalysisReport /> },
      { path: 'sales/reports/export', element: <ExportCenter /> },
      // ── BI Analytics Dashboards (Phase 5) ────────────
      { path: 'analytics/overview', element: <OverviewAnalyticsPage /> },
      { path: 'analytics/sales', element: <SalesAnalyticsPage /> },
      { path: 'analytics/purchase', element: <PurchaseAnalyticsPage /> },
      { path: 'analytics/inventory', element: <InventoryAnalyticsPage /> },
      { path: 'analytics/finance', element: <FinanceAnalyticsPage /> },
      { path: 'analytics/gst', element: <GstAnalyticsPage /> },
      { path: 'analytics/customers', element: <CustomerAnalyticsPage /> },
      { path: 'analytics/suppliers', element: <SupplierAnalyticsPage /> },
      { path: 'analytics/warehouses', element: <WarehouseAnalyticsPage /> },
      { path: 'analytics/profitability', element: <ProfitabilityAnalyticsPage /> },
      { path: 'analytics/cashflow', element: <CashFlowAnalyticsPage /> },
      { path: 'analytics/growth', element: <GrowthAnalyticsPage /> },
      { path: 'analytics/top-bottom', element: <TopBottomAnalyticsPage /> },
      // ── CRM (Phase 6) ────────────────────────────────
      { path: 'crm/dashboard', element: <CrmDashboardPage /> },
      { path: 'crm/leads', element: <LeadsPage /> },
      { path: 'crm/leads/new', element: <LeadFormPage /> },
      { path: 'crm/leads/:id', element: <LeadDetailPage /> },
      { path: 'crm/leads/:id/edit', element: <LeadFormPage /> },
      { path: 'crm/pipeline', element: <CrmPipelinePage /> },
      { path: 'crm/follow-ups', element: <FollowUpsPage /> },
      { path: 'crm/tasks', element: <CrmTasksPage /> },
      { path: 'crm/reports', element: <CrmReportsPage /> },
      // ── Communication & Notifications (Phase 7) ──────────
      { path: 'communications/center', element: <NotificationCenterPage /> },
      // ── HR & Employee Management (Phase 8) ──────────────
      { path: 'hr/dashboard', element: <HrDashboardPage /> },
      { path: 'hr/employees', element: <EmployeesPage /> },
      { path: 'hr/employees/new', element: <EmployeeFormPage /> },
      { path: 'hr/employees/:id', element: <EmployeeDetailPage /> },
      { path: 'hr/employees/:id/edit', element: <EmployeeFormPage /> },
      { path: 'hr/attendance', element: <AttendancePage /> },
      { path: 'hr/leave', element: <LeavePage /> },
      { path: 'hr/payroll', element: <PayrollPage /> },
      { path: 'assets', element: <AssetExpenseDashboardPage /> },
      { path: 'assets/list', element: <AssetsPage /> },
      { path: 'assets/new', element: <AssetFormPage /> },
      { path: 'assets/:id', element: <AssetDetailPage /> },
      { path: 'assets/:id/edit', element: <AssetFormPage /> },
      { path: 'assets/maintenance', element: <AssetsPage /> },
      { path: 'expenses', element: <ExpensesPage /> },
      { path: 'expenses/new', element: <ExpenseFormPage /> },
      { path: 'workflow/control', element: <BusinessControlPage /> },
      { path: 'control/business-rules', element: <BusinessRulesPage /> },
      { path: 'control/custom-fields', element: <CustomFieldsPage /> },
      { path: 'control/tags', element: <TagsPage /> },
      { path: 'control/global-search', element: <GlobalSearchPage /> },

      // ── Commercial (Phase 12) ─────────────────────
      { path: 'commercial/dashboard', element: <CommercialDashboardPage /> },
      { path: 'commercial/plans', element: <CommercialPlansPage /> },
      { path: 'commercial/subscriptions', element: <CommercialSubscriptionsPage /> },
      { path: 'commercial/coupons', element: <CommercialCouponsPage /> },
      { path: 'commercial/billing', element: <CommercialBillingPage /> },
      { path: 'commercial/reports', element: <CommercialReportsPage /> },

      // ── License (Phase 13) ─────────────────────────
      { path: 'license/dashboard', element: <LicenseDashboardPage /> },
      { path: 'license', element: <LicensesPage /> },
      { path: 'license/:id', element: <LicenseDetailPage /> },
      { path: 'communications/log', element: <CommunicationLogPage /> },
      { path: 'communications/templates', element: <CommunicationTemplatesPage /> },
      { path: 'communications/settings', element: <CommunicationSettingsPage /> },
      // ── Sales Approval Workflow (Step 11) ────────────
      { path: 'sales/approvals', element: <ApprovalsPage /> },
      { path: 'sales/approvals/dashboard', element: <ApprovalDashboard /> },
      { path: 'sales/approvals/settings', element: <ApprovalSettings /> },
      // ── Sales Credit Control (Step 12) ────────────
      { path: 'sales/credit/dashboard', element: <CreditDashboardPage /> },
      { path: 'sales/credit/customers', element: <CreditCustomersPage /> },
      { path: 'sales/credit/ageing', element: <AgeingReportPage /> },
      { path: 'sales/credit/recovery', element: <RecoveryDashboardPage /> },
      { path: 'sales/credit/credit-hold', element: <CreditHoldDashboardPage /> },
      { path: 'sales/credit/reminders', element: <ReminderEnginePage /> },
      // ── Sales Returns Engine (Step 13) ────────────
      { path: 'sales/returns/create', element: <CreateReturnPage /> },
      { path: 'sales/returns/credit-notes', element: <CreditNotesPage /> },
      { path: 'sales/returns/debit-notes', element: <DebitNotesPage /> },
      { path: 'sales/returns/reports', element: <ReturnReportsPage /> },
      // ── Finance Modules ────────────────────────────
      { path: 'finance/dashboard', element: <FinanceDashboardPage /> },
      { path: 'finance/account-groups', element: <AccountGroupsPage /> },
      { path: 'finance/account-groups/create', element: <CreateAccountGroupPage /> },
      { path: 'finance/account-groups/:id/edit', element: <CreateAccountGroupPage /> },
      { path: 'finance/chart-of-accounts', element: <ChartOfAccountsPage /> },
      { path: 'finance/chart-of-accounts/create', element: <CreateChartOfAccountPage /> },
      { path: 'finance/chart-of-accounts/:id/edit', element: <CreateChartOfAccountPage /> },
      { path: 'finance/ledgers', element: <LedgerMasterPage /> },
      { path: 'finance/ledgers/create', element: <CreateLedgerPage /> },
      { path: 'finance/ledgers/:id/edit', element: <CreateLedgerPage /> },
      { path: 'finance/journal-entries', element: <JournalEntriesPage /> },
      { path: 'finance/journal-entries/create', element: <CreateJournalEntryPage /> },
      { path: 'finance/journal-entries/:id/edit', element: <CreateJournalEntryPage /> },
      { path: 'finance/cash-book', element: <CashBookPage /> },
      { path: 'finance/bank-book', element: <BankBookPage /> },
      { path: 'finance/cost-centers', element: <CostCentersPage /> },
      { path: 'finance/cost-centers/create', element: <CreateCostCenterPage /> },
      { path: 'finance/cost-centers/:id/edit', element: <CreateCostCenterPage /> },
      // Password-gated direct settings form — create/edit routes redirect yahan par
      // (taaki password gate bypass na ho aur sab kuch ek hi page se ho)
      { path: 'finance/settings', element: <AccountingSettingsPage /> },
      { path: 'finance/settings/create', element: <Navigate to="/finance/settings" replace /> },
      { path: 'finance/settings/:id/edit', element: <Navigate to="/finance/settings" replace /> },
      // Purane /settings links/bookmarks → Accounting Settings (404 se bachne ke liye)
      { path: 'settings', element: <Navigate to="/finance/settings" replace /> },
      // ── GL / Reporting Modules ─────────────────────
      { path: 'gl/dashboard', element: <FinancialDashboardPage /> },
      { path: 'gl/entries', element: <GlEntriesPage /> },
      { path: 'gl/entries/create', element: <CreateGlEntryPage /> },
      { path: 'gl/entries/:id/edit', element: <CreateGlEntryPage /> },
      { path: 'gl/posting-rules', element: <PostingRulesPage /> },
      { path: 'gl/posting-rules/create', element: <CreatePostingRulePage /> },
      { path: 'gl/posting-rules/:id/edit', element: <CreatePostingRulePage /> },
      { path: 'gl/fiscal-closing', element: <FiscalClosingPage /> },
      { path: 'gl/fiscal-closing/create', element: <CreateFiscalClosingPage /> },
      { path: 'gl/fiscal-closing/:id/edit', element: <CreateFiscalClosingPage /> },
      { path: 'gl/trial-balance', element: <TrialBalancePage /> },
      { path: 'gl/profit-loss', element: <ProfitLossPage /> },
      { path: 'gl/balance-sheet', element: <BalanceSheetPage /> },
      { path: 'gl/cash-flow', element: <CashFlowPage /> },
      { path: 'gl/day-book', element: <DayBookPage /> },
      { path: 'gl/account-statement', element: <AccountStatementPage /> },
      // ── Automation Engine Modules ─────────────────
      { path: 'automation/posting', element: <Navigate to="/" replace /> },
      { path: 'automation/dashboard', element: <Navigate to="/" replace /> },
      { path: 'automation/monitor', element: <Navigate to="/" replace /> },
      { path: 'automation/integration', element: <Navigate to="/" replace /> },
      { path: 'automation/health', element: <Navigate to="/" replace /> },
      // ── GST, Audit & Financial Closing Modules ─────
      { path: 'gst/dashboard', element: <Navigate to="/" replace /> },
      { path: 'gst/analytics', element: <Navigate to="/" replace /> },
      { path: 'gst/registrations', element: <GstRegistrationsPage /> },
      { path: 'gst/ledger', element: <GstLedgerPage /> },
      { path: 'gst/returns', element: <GstReturnsPage /> },
      { path: 'gst/tax-postings', element: <TaxPostingsPage /> },
      { path: 'gst/year-closing', element: <YearClosingPage /> },
      { path: 'gst/period-locks', element: <PeriodLocksPage /> },
      { path: 'gst/opening-balance-transfers', element: <OpeningBalanceTransfersPage /> },
      { path: 'gst/year-end-entries', element: <YearEndEntriesPage /> },
      { path: 'gst/audit-details', element: <AuditDetailsPage /> },
      { path: 'gst/registrations/create', element: <CreateGstRegistrationPage /> },
      { path: 'gst/registrations/:id/edit', element: <CreateGstRegistrationPage /> },
      { path: 'gst/tax-postings/create', element: <CreateTaxPostingPage /> },
      { path: 'gst/tax-postings/:id/edit', element: <CreateTaxPostingPage /> },
      { path: 'gst/number-series', element: <NumberSeriesPage /> },
      { path: 'gst/number-series/create', element: <CreateNumberSeriesPage /> },
      { path: 'gst/voucher-approvals', element: <VoucherApprovalsPage /> },
      { path: 'gst/settings', element: <GstAuditSettingsPage /> },
      { path: 'gst/settings/create', element: <CreateGstAuditSettingsPage /> },
      { path: 'gst/settings/:id/edit', element: <CreateGstAuditSettingsPage /> },
    ],
  }, // ── Old dashboards — all redirect to main dashboard ──
  { path: 'executive/ceo', element: <Navigate to="/" replace /> },
  { path: 'executive/director', element: <Navigate to="/" replace /> },
  { path: 'executive/admin', element: <Navigate to="/" replace /> },
  { path: 'executive/operations', element: <Navigate to="/" replace /> },
  { path: 'executive/user', element: <Navigate to="/" replace /> },
  { path: 'bi/purchase', element: <Navigate to="/" replace /> },
  { path: 'bi/sales', element: <Navigate to="/" replace /> },
  { path: 'bi/inventory', element: <Navigate to="/" replace /> },
  { path: 'bi/finance', element: <Navigate to="/" replace /> },
  { path: 'bi/gst', element: <Navigate to="/" replace /> },
  { path: 'bi/customers', element: <Navigate to="/" replace /> },
  { path: 'bi/suppliers', element: <Navigate to="/" replace /> },
  { path: 'bi/warehouses', element: <Navigate to="/" replace /> },
  { path: 'bi/profitability', element: <Navigate to="/" replace /> },
  { path: 'bi/cash-flow', element: <Navigate to="/" replace /> },
  { path: 'bi/growth', element: <Navigate to="/" replace /> },
  { path: 'dms/dashboard', element: <Navigate to="/" replace /> },
  { path: 'dms/documents', element: <DocumentListPage /> },
  { path: 'dms/folders', element: <DocumentFoldersPage /> },
  { path: 'dms/tags', element: <DocumentTagsPage /> },
  { path: 'dms/ocr', element: <OcrQueuePage /> },
  { path: 'dms/signatures', element: <DigitalSignaturesPage /> },
  { path: 'dms/compliance', element: <DocumentCompliancePage /> },
  { path: 'workflow/dashboard', element: <Navigate to="/" replace /> },
  { path: 'workflow/approvals', element: <ApprovalDashboardPage /> },
  { path: 'workflow/tasks', element: <PendingTasksDashboardPage /> },
  { path: 'workflow/my-tasks', element: <MyTasksDashboardPage /> },
  { path: 'workflow/escalation', element: <EscalationDashboardPage /> },
  // ── Customer Portal Admin (Phase 11) ──────────
  { path: 'portal-admin', element: <PortalAdminPage /> },
  { path: 'ai/dashboard', element: <Navigate to="/" replace /> },
  { path: 'ai/insights', element: <Navigate to="/" replace /> },
  { path: 'ai/forecasts', element: <Navigate to="/" replace /> },
  { path: 'ai/usage', element: <Navigate to="/" replace /> },

  // ── Auth Routes ──────────────────────────────────
  {
    path: '/auth',
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'access-denied', element: <AccessDeniedPage /> },
      { path: 'session-expired', element: <SessionExpiredPage /> },
      { path: 'setup', element: <SetupWizardPage /> },
    ],
  },

  // ── Activation (Phase 14) — first-run / recovery, public ──
  { path: '/activate', element: <ActivationPage /> },

  // ── Customer Portal (Phase 11) — isolated from internal ERP ──
  {
    path: '/portal/login',
    element: (
      <PortalAuthProvider>
        <PortalLoginPage />
      </PortalAuthProvider>
    ),
  },
  {
    path: '/portal',
    element: <PortalRoutes />,
    children: [
      { index: true, element: <PortalDashboardPage /> },
      { path: 'quotations', element: <PortalQuotationsPage /> },
      { path: 'quotations/:id', element: <PortalQuotationDetailPage /> },
      { path: 'orders', element: <PortalOrdersPage /> },
      { path: 'orders/:id', element: <PortalOrderDetailPage /> },
      { path: 'invoices', element: <PortalInvoicesPage /> },
      { path: 'invoices/:id', element: <PortalInvoiceDetailPage /> },
      { path: 'outstanding', element: <PortalOutstandingPage /> },
      { path: 'ledger', element: <PortalLedgerPage /> },
      { path: 'documents', element: <PortalDocumentsPage /> },
      { path: 'tickets', element: <PortalTicketsPage /> },
      { path: 'tickets/:id', element: <PortalTicketDetailPage /> },
      { path: 'profile', element: <PortalProfilePage /> },
      { path: 'billing', element: <PortalBillingPage /> },
      { path: 'license', element: <PortalLicensePage /> },
    ],
  },

  {
    path: '*',
    element: <NotFoundPage />,
  },
];

export const router = createBrowserRouter(routes);
