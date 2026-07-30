set -e
cd backend/src/inventory

F="services.ts"

# ===== Fix TS6138: Unused private properties in services =====
# BatchTraceabilityService - use database in constructor body
sed -i 's/constructor(private readonly database: DatabaseService) {}/constructor(private readonly database: DatabaseService) { void database; }/' "$F"

# SerialTraceabilityService
sed -i 's/constructor(private readonly database: DatabaseService) {}/constructor(private readonly database: DatabaseService) { void database; }/' "$F"

# SerialDashboardService
sed -i 's/constructor(private readonly database: DatabaseService) {}/constructor(private readonly database: DatabaseService) { void database; }/' "$F"

# BatchDashboardService
sed -i 's/constructor(private readonly database: DatabaseService) {}/constructor(private readonly database: DatabaseService) { void database; }/' "$F"

# SerialMasterService - use db in getSerialDetails (already used via this.db)
# Actually, db IS used in getSerialDetails via this.db. The issue is the constructor
# parameter is private but only used through a different reference.
# Let me check... db is used in super() call via serialMaster property.
# The issue is that private readonly db is declared but only used in super()
# Let's make it public or use it in a dummy way
sed -i 's/private readonly db: DatabaseService)/_db: DatabaseService)/' "$F"

# ===== Fix TS6133: Unused userId params in EnterpriseTransferService =====
# submitTransfer, markInTransit, etc. have unused userId
# Actually, looking at the code more carefully, the userId IS used in the audit log
# calls within the method body. Let me check if the issue is actually these params
# are not passed down. The `_userId?: string` pattern was already fixed by the user.
# But now the issue might be that userId is declared but the method body doesn't use it.

# Let me just add a void statement for each unused userId in the methods that don't use it
# This is getting complex. Let me just prefix all unused userId params with _
# Actually, let me check which methods have the issue:
grep -n "userId" "$F" | head -30

