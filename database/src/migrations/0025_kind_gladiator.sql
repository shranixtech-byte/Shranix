CREATE TABLE `shranix_security_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`event_id` text NOT NULL,
	`event_type` text NOT NULL,
	`severity` text DEFAULT 'LOW' NOT NULL,
	`event_time` text NOT NULL,
	`customer_id` text,
	`license_id` text,
	`device_ref` text,
	`installation_ref` text,
	`source` text,
	`ip_address` text,
	`actor` text,
	`response_level` integer DEFAULT 1 NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE INDEX `sec_event_id_idx` ON `shranix_security_events` (`event_id`);--> statement-breakpoint
CREATE INDEX `sec_type_idx` ON `shranix_security_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `sec_severity_idx` ON `shranix_security_events` (`severity`);--> statement-breakpoint
CREATE INDEX `sec_time_idx` ON `shranix_security_events` (`event_time`);--> statement-breakpoint
CREATE INDEX `sec_customer_idx` ON `shranix_security_events` (`customer_id`);--> statement-breakpoint
CREATE INDEX `sec_license_idx` ON `shranix_security_events` (`license_id`);