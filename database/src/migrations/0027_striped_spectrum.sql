CREATE INDEX `inv_ledger_item_idx` ON `shranix_inv_stock_ledger` (`item_id`);--> statement-breakpoint
CREATE INDEX `inv_ledger_wh_item_idx` ON `shranix_inv_stock_ledger` (`warehouse_id`,`item_id`);--> statement-breakpoint
CREATE INDEX `inv_ledger_date_idx` ON `shranix_inv_stock_ledger` (`transaction_date`);--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════
-- H1: ONE-TIME DATA BACKFILL — legacy ledgers → canonical ledger
--   shranix_stock_ledger      → shranix_inv_stock_ledger  (historical movements)
--   shranix_warehouse_stock   → shranix_inv_stock_balance (historical balances)
--
-- Deterministic + idempotent (INSERT OR IGNORE against the unique
-- reference_number / (warehouse_id,item_id) constraints). Re-running this
-- migration is a no-op. Legacy tables are retained (LEGACY / READ-ONLY).
-- ═══════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO `shranix_inv_stock_ledger` (
	`id`, `created_at`, `entry_number`, `reference_number`, `transaction_type`,
	`direction`, `transaction_date`, `posting_date`, `item_id`, `batch_no`,
	`warehouse_id`, `uom`, `quantity`, `unit_cost`, `amount`,
	`balance_quantity`, `balance_cost`, `document_ref`, `document_type`, `remarks`, `created_by`
)
SELECT
	hex(randomblob(16)),
	COALESCE(`created_at`, datetime('now')),
	'LEGACY-' || `id`,
	'LEGACY-' || COALESCE(`document_type`,'movement') || '-' || COALESCE(`document_ref`,`id`) || '-' || `id`,
	CASE WHEN `transaction_type` = 'sales_invoice' THEN 'sales_issue' ELSE `transaction_type` END,
	CASE
		WHEN `transaction_type` IN ('purchase_receipt','sales_return','opening') THEN 'IN'
		WHEN `transaction_type` = 'purchase_return' THEN 'OUT'
		WHEN `transaction_type` = 'sales_invoice' THEN 'OUT'
		WHEN `transaction_type` = 'stock_adjustment' THEN CASE WHEN `quantity` >= 0 THEN 'IN' ELSE 'OUT' END
		ELSE CASE WHEN `quantity` >= 0 THEN 'IN' ELSE 'OUT' END
	END,
	COALESCE(`created_at`, datetime('now')),
	COALESCE(`created_at`, datetime('now')),
	`item_id`, `batch_no`, `warehouse_id`, NULL, ABS(`quantity`),
	`rate`, `amount`, `after_qty`, COALESCE(`after_qty`,0) * COALESCE(`rate`,0),
	`document_ref`, `document_type`, `remarks`, `created_by`
FROM `shranix_stock_ledger`;--> statement-breakpoint

INSERT OR IGNORE INTO `shranix_inv_stock_balance` (
	`id`, `created_at`, `updated_at`, `item_id`, `warehouse_id`, `on_hand`, `available`, `reserved`
)
SELECT
	hex(randomblob(16)), datetime('now'), datetime('now'),
	`item_id`, `warehouse_id`, `quantity`,
	`quantity` - COALESCE(`reserved_quantity`,0), COALESCE(`reserved_quantity`,0)
FROM `shranix_warehouse_stock`;