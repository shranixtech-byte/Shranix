DROP INDEX IF EXISTS `gl_account_date_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `gl_voucher_idx`;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `gl_account_date_idx` ON `shranix_gl_entries` (`account_id`,`entry_date`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `gl_voucher_idx` ON `shranix_gl_entries` (`voucher_id`,`account_id`);