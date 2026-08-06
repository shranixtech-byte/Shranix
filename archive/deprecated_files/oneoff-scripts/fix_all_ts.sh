set -e
cd backend/src/inventory

# Fix UOMConversionService.convert - prefix unused params with _
sed -i 's/async convert(from: string, to: string, qty: number, itemId?: string) { return qty; }/async convert(_from: string, _to: string, qty: number, _itemId?: string) { return qty; }/' services.ts

# Fix ProductAttributeService.getAttributesByItem
sed -i 's/async getAttributesByItem(itemId: string) { return { data: \[\], total: 0 }; }/async getAttributesByItem(_itemId: string) { return { data: [], total: 0 }; }/' services.ts

# Fix ItemPackagingService.getPackagingByItem
sed -i 's/async getPackagingByItem(itemId: string) { return { data: \[\], total: 0 }; }/async getPackagingByItem(_itemId: string) { return { data: [], total: 0 }; }/' services.ts

# Fix BatchMasterService stub methods - prefix unused params
sed -i 's/async release(id: string, userId?: string) { return this.update(id, { status: "released" }, userId); }/async release(id: string, userId?: string) { return this.update(id, { status: "released" }, userId); }/' services.ts
sed -i 's/async block(id: string, reason: string, userId?: string) { return this.update(id, { status: "blocked", remarks: reason }, userId); }/async block(id: string, reason: string, userId?: string) { return this.update(id, { status: "blocked", remarks: reason }, userId); }/' services.ts
sed -i 's/async selectBatches(itemId: string, warehouseId: string, qty: number, strategy: string) { return { allocated: \[\], remaining: qty, fullAllocation: false, strategy }; }/async selectBatches(_itemId: string, _warehouseId: string, qty: number, _strategy: string) { return { allocated: [], remaining: qty, fullAllocation: false, strategy: _strategy }; }/' services.ts
sed -i 's/async getExpiryAlerts(days?: number) { return { expired: \[\], nearExpiry: \[\], totalBatches: 0 }; }/async getExpiryAlerts(_days?: number) { return { expired: [], nearExpiry: [], totalBatches: 0 }; }/' services.ts

# Fix BatchLotService stub methods
sed -i 's/async splitLot(id: string, qty: number, code: string, userId?: string) { return this.create({ lotCode: code, quantity: qty }, userId); }/async splitLot(_id: string, qty: number, code: string, _userId?: string) { return this.create({ lotCode: code, quantity: qty }); }/' services.ts
sed -i 's/async mergeLots(src: string, tgt: string, userId?: string) { return this.findById(tgt); }/async mergeLots(_src: string, tgt: string, _userId?: string) { return this.findById(tgt); }/' services.ts

# Fix BatchTraceabilityService stub methods
sed -i 's/async forwardTrace(id: string) { return { batchId: id, childRelationships: \[\] }; }/async forwardTrace(_id: string) { return { batchId: "", childRelationships: [] }; }/' services.ts
sed -i 's/async backwardTrace(id: string) { return { batchId: id, parentRelationships: \[\] }; }/async backwardTrace(_id: string) { return { batchId: "", parentRelationships: [] }; }/' services.ts
sed -i 's/async fullGenealogy(id: string) { return { forward: null, backward: null }; }/async fullGenealogy(_id: string) { return { forward: null, backward: null }; }/' services.ts

# Fix SerialTraceabilityService stub methods
sed -i 's/async findChildren(id: string) { return \[\]; }/async findChildren(_id: string) { return []; }/' services.ts
sed -i 's/async findParents(id: string) { return \[\]; }/async findParents(_id: string) { return []; }/' services.ts
sed -i 's/async getHistory(id: string) { return { data: \[\], total: 0 }; }/async getHistory(_id: string) { return { data: [], total: 0 }; }/' services.ts

# Fix SerialMasterService.getSerialDetails
sed -i 's/async getSerialDetails(id: string) { const s = await this.findById(id); if (!s) return null; return { serial: s, warranty: \[\], installation: \[\], service: \[\], history: \[\] }; }/async getSerialDetails(id: string) { const s = await this.findById(id); if (!s) return null; return { serial: s, warranty: [], installation: [], service: [], history: [] }; }/' services.ts

# Use the unused db property in SerialMasterService constructor
# Actually let's use @Injectable approach - keep db but use it

# Fix EnterpriseTransferService userId params (lines 860, 892, 909, 916, 923, 957, 964)
sed -i 's/submitTransfer(id: string, _userId?: string) {/submitTransfer(id: string, userId?: string) {/' services.ts

# And markInTransit unused userId
sed -i 's/markInTransit(id: string, expectedArrival?: string, transitNotes?: string, _userId?: string)/markInTransit(id: string, expectedArrival?: string, transitNotes?: string, userId?: string)/' services.ts

# Actually, let's see the exact line issues. The errors are about unused variables from the
# sed-generated stubs that are proper this time (no corruption).
# The problem is services that have unused `userId` params in some methods.
# Let me check if these are from the EnterpriseTransferService

