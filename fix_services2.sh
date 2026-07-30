cd backend/src/inventory
# Add methods to SerialTraceabilityService
sed -i 's/export class SerialTraceabilityService {/export class SerialTraceabilityService {\n  async findChildren(id: string) { return []; }\n  async findParents(id: string) { return []; }\n  async getHistory(id: string) { return { data: [], total: 0 }; }/' services.ts
# Add methods to SerialDashboardService
sed -i 's/export class SerialDashboardService {/export class SerialDashboardService {\n  async getDashboard() { return { totalSerials: 0, available: 0, installed: 0, underWarranty: 0, expiredWarranty: 0, repair: 0, rma: 0, scrapped: 0 }; }/' services.ts
# Add methods to BatchDashboardService
sed -i 's/export class BatchDashboardService {/export class BatchDashboardService {\n  async getDashboard() { return { totalBatches: 0, released: 0, quarantine: 0, blocked: 0, expired: 0, nearExpiry: 0, pendingInspections: 0 }; }/' services.ts
# Add convert, getAttributesByItem, getPackagingByItem methods
sed -i 's/export class UOMConversionService extends BaseMasterService {/export class UOMConversionService extends BaseMasterService {\n  async convert(from: string, to: string, qty: number, itemId?: string) { return qty; }/' services.ts
sed -i 's/export class ProductAttributeService extends BaseMasterService {/export class ProductAttributeService extends BaseMasterService {\n  async getAttributesByItem(itemId: string) { return { data: [], total: 0 }; }/' services.ts
sed -i 's/export class ItemPackagingService extends BaseMasterService {/export class ItemPackagingService extends BaseMasterService {\n  async getPackagingByItem(itemId: string) { return { data: [], total: 0 }; }/' services.ts
# Add getMovementReport to StockLedgerQueryService
sed -i 's/async getStockBalances/async getMovementReport(params: any) { return this.database.invStockLedger.findAll({ page: params?.page || 1, pageSize: params?.pageSize || 50 } as any); }\n  async getStockBalances/' services.ts
