-- ═══════════════════════════════════════════════════════════════
-- H6: WEBHOOK DELIVERY HISTORY
--
-- Records each outbound webhook delivery attempt for auditability.
-- Does NOT store secrets or full payloads — only status, timing,
-- and error information.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `shranix_webhook_deliveries` (
  `id`           TEXT PRIMARY KEY NOT NULL,
  `webhook_id`   TEXT NOT NULL,
  `attempt`      INTEGER NOT NULL DEFAULT 1,
  `status`       TEXT NOT NULL DEFAULT 'sending',  -- sending | delivered | retrying | failed
  `http_status`  INTEGER,
  `error`        TEXT,
  `triggered_at` TEXT NOT NULL,
  `completed_at` TEXT
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `wd_webhook_idx`
  ON `shranix_webhook_deliveries` (`webhook_id`);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `wd_status_idx`
  ON `shranix_webhook_deliveries` (`status`);--> statement-breakpoint
