-- ═══════════════════════════════════════════════════════════════
-- BRANCH ISOLATION: Add branchId to invoice tables
--
-- Adds branch_id to sales_invoices and purchase_invoices so that
-- branch-scoped queries can filter invoices by branch. Existing
-- rows receive NULL (unscoped) which preserves backward
-- compatibility — analytics and reports treat NULL branchId as
-- "all branches".
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE `shranix_sales_invoices` ADD COLUMN `branch_id` TEXT;--> statement-breakpoint
ALTER TABLE `shranix_purchase_invoices` ADD COLUMN `branch_id` TEXT;--> statement-breakpoint
