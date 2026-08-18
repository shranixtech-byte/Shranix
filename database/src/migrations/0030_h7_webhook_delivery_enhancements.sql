-- ═══════════════════════════════════════════════════════════════
-- H7: WEBHOOK DELIVERY ENHANCEMENTS
--
-- Adds event_type, payload_ref, and provider_reference columns
-- to enable reliable retry with original event context and
-- provider correlation.
--
-- Backward compatible: all new columns are nullable.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE `shranix_webhook_deliveries` ADD COLUMN `event_type` TEXT;--> statement-breakpoint
ALTER TABLE `shranix_webhook_deliveries` ADD COLUMN `payload_ref` TEXT;--> statement-breakpoint
ALTER TABLE `shranix_webhook_deliveries` ADD COLUMN `provider_reference` TEXT;--> statement-breakpoint
