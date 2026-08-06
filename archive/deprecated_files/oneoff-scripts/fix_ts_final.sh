set -e
F="backend/src/inventory/services.ts"

# ===== Fix TS6138: Unused private database properties =====
# BatchTraceabilityService
sed -i 's/constructor(private readonly database: DatabaseService) {}/constructor(_database: DatabaseService) {}/' "$F"
# SerialTraceabilityService  
sed -i 's/constructor(private readonly database: DatabaseService) { void database; }/constructor(database: DatabaseService) { void database; }/' "$F"
sed -i 's/constructor(database: DatabaseService) { void database; }/constructor(database: DatabaseService) { void database; }/' "$F"
# Just make them non-private and unused - the void pattern works

# Actually let me use a different approach - just prefix all these with underscore
# Reset and do clean replacements
sed -i 's/constructor(private readonly database: DatabaseService) {/constructor(_database: DatabaseService) {/' "$F"

# Fix SerialMasterService - make db not private readonly
sed -i 's/private readonly db: DatabaseService)/db: DatabaseService)/' "$F"

# ===== Fix TS6133: Unused userId params in EnterpriseTransferService =====
sed -i 's/submitTransfer(id: string, userId?: string) {/submitTransfer(id: string, _userId?: string) {/' "$F"
sed -i 's/markInTransit(id: string, expectedArrival?: string, transitNotes?: string, userId?: string)/markInTransit(id: string, expectedArrival?: string, transitNotes?: string, _userId?: string)/' "$F"
sed -i 's/receiveTransfer(input: {/receiveTransfer(input: {/' "$F"
sed -i 's/rejectTransfer(id: string, reason: string, userId?: string) {/rejectTransfer(id: string, reason: string, _userId?: string) {/' "$F"
sed -i 's/cancelTransfer(id: string, reason: string, userId?: string) {/cancelTransfer(id: string, reason: string, _userId?: string) {/' "$F"

# Also fix EnterpriseAdjustmentService unused userId params
sed -i 's/submitAdjustment(id: string, _userId?: string) {/submitAdjustment(id: string, userId?: string) {/' "$F"
sed -i 's/rejectAdjustment(id: string, reason: string, userId?: string) {/rejectAdjustment(id: string, reason: string, userId?: string) {/' "$F"
sed -i 's/rejectAdjustment(id: string, reason: string, _userId?: string) {/rejectAdjustment(id: string, reason: string, userId?: string) {/' "$F"

# ===== Fix TS18048: Possibly undefined params =====
sed -i 's/if (params.fromDate) filters.push({ field: '"'"'transactionDate'"'"', operator: '"'"'gte'"'"' as const, value: params.fromDate });/if (params.fromDate) filters.push({ field: "transactionDate", operator: "gte" as const, value: params.fromDate! });/' "$F"
sed -i 's/if (params.toDate) filters.push({ field: '"'"'transactionDate'"'"', operator: '"'"'lte'"'"' as const, value: params.toDate });/if (params.toDate) filters.push({ field: "transactionDate", operator: "lte" as const, value: params.toDate! });/' "$F"

# ===== Fix TS2353: sourceWarehouseId not in type =====
# Change the EnterpriseTransferService.getReport method to not use sourceWarehouseId
# Instead use the already defined warehouseId parameter directly

