-- ═══════════════════════════════════════════════════════════════
-- H5: DISTRIBUTED LOCK TABLE
--
-- Enables exactly-once execution of scheduled background jobs
-- across multiple application replicas. Uses atomic INSERT OR IGNORE
-- + unique constraint on job_key for lock acquisition, with lease
-- expiry for stale lock recovery.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `shranix_job_locks` (
  `id`          TEXT PRIMARY KEY NOT NULL,
  `job_key`     TEXT NOT NULL,
  `owner_token` TEXT NOT NULL,
  `acquired_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `expires_at`  TEXT NOT NULL,
  `updated_at`  TEXT NOT NULL DEFAULT (datetime('now'))
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS `job_lock_key_idx`
  ON `shranix_job_locks` (`job_key`);--> statement-breakpoint
