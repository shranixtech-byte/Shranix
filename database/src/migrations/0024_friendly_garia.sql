CREATE TABLE `shranix_license_activations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`activation_public_id` text NOT NULL,
	`license_id` text NOT NULL,
	`installation_id` text,
	`device_id` text,
	`activation_type` text DEFAULT 'online' NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`activation_reference` text NOT NULL,
	`requested_at` text NOT NULL,
	`approved_at` text,
	`deactivated_at` text,
	`last_validation_at` text,
	`reason` text,
	`metadata` text,
	`requested_by` text,
	`approved_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `la_public_id_idx` ON `shranix_license_activations` (`activation_public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `la_reference_idx` ON `shranix_license_activations` (`activation_reference`);--> statement-breakpoint
CREATE INDEX `la_license_idx` ON `shranix_license_activations` (`license_id`);--> statement-breakpoint
CREATE INDEX `la_device_idx` ON `shranix_license_activations` (`device_id`);--> statement-breakpoint
CREATE INDEX `la_status_idx` ON `shranix_license_activations` (`status`);--> statement-breakpoint
CREATE TABLE `shranix_license_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`device_public_id` text NOT NULL,
	`license_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`device_identifier_hash` text NOT NULL,
	`device_name` text,
	`platform` text,
	`os` text,
	`application_version` text,
	`status` text DEFAULT 'active' NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text,
	`last_validation_at` text,
	`metadata` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ld_public_id_idx` ON `shranix_license_devices` (`device_public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ld_license_device_idx` ON `shranix_license_devices` (`license_id`,`device_identifier_hash`);--> statement-breakpoint
CREATE INDEX `ld_license_idx` ON `shranix_license_devices` (`license_id`);--> statement-breakpoint
CREATE INDEX `ld_customer_idx` ON `shranix_license_devices` (`customer_id`);--> statement-breakpoint
CREATE INDEX `ld_status_idx` ON `shranix_license_devices` (`status`);--> statement-breakpoint
CREATE TABLE `shranix_license_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`license_id` text NOT NULL,
	`event_type` text NOT NULL,
	`event_time` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`actor` text,
	`source` text,
	`installation_ref` text,
	`device_ref` text,
	`metadata` text
);
--> statement-breakpoint
CREATE INDEX `lev_license_idx` ON `shranix_license_events` (`license_id`);--> statement-breakpoint
CREATE INDEX `lev_type_idx` ON `shranix_license_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `lev_time_idx` ON `shranix_license_events` (`event_time`);--> statement-breakpoint
CREATE TABLE `shranix_license_installations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`installation_public_id` text NOT NULL,
	`license_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`installation_name` text,
	`application_version` text,
	`platform` text,
	`os_version` text,
	`device_identifier_hash` text,
	`machine_fingerprint_hash` text,
	`status` text DEFAULT 'active' NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text,
	`activated_at` text,
	`deactivated_at` text,
	`last_validation_at` text,
	`metadata` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `li_public_id_idx` ON `shranix_license_installations` (`installation_public_id`);--> statement-breakpoint
CREATE INDEX `li_license_idx` ON `shranix_license_installations` (`license_id`);--> statement-breakpoint
CREATE INDEX `li_customer_idx` ON `shranix_license_installations` (`customer_id`);--> statement-breakpoint
CREATE INDEX `li_status_idx` ON `shranix_license_installations` (`status`);--> statement-breakpoint
CREATE TABLE `shranix_license_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`license_id` text NOT NULL,
	`token_version` integer DEFAULT 1 NOT NULL,
	`token_jti` text NOT NULL,
	`token` text,
	`issued_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`revoked_at` text,
	`revoked_reason` text
);
--> statement-breakpoint
CREATE INDEX `ltok_license_idx` ON `shranix_license_tokens` (`license_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ltok_jti_idx` ON `shranix_license_tokens` (`token_jti`);--> statement-breakpoint
CREATE INDEX `ltok_status_idx` ON `shranix_license_tokens` (`status`);--> statement-breakpoint
CREATE INDEX `ltok_expires_idx` ON `shranix_license_tokens` (`expires_at`);--> statement-breakpoint
CREATE TABLE `shranix_license_transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`transfer_public_id` text NOT NULL,
	`license_id` text NOT NULL,
	`from_device_id` text,
	`to_device_id` text,
	`from_device_ref` text,
	`to_device_ref` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_at` text NOT NULL,
	`requested_by` text,
	`approved_at` text,
	`approved_by` text,
	`reason` text,
	`metadata` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lt_public_id_idx` ON `shranix_license_transfers` (`transfer_public_id`);--> statement-breakpoint
CREATE INDEX `lt_license_idx` ON `shranix_license_transfers` (`license_id`);--> statement-breakpoint
CREATE INDEX `lt_status_idx` ON `shranix_license_transfers` (`status`);--> statement-breakpoint
CREATE TABLE `shranix_licenses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`license_number` text NOT NULL,
	`license_public_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`subscription_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`plan_version_id` text,
	`license_type` text DEFAULT 'standard' NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`issued_at` text,
	`starts_at` text,
	`expires_at` text,
	`grace_until` text,
	`max_users` integer DEFAULT 5 NOT NULL,
	`max_devices` integer DEFAULT 1 NOT NULL,
	`max_branches` integer DEFAULT 1 NOT NULL,
	`max_installations` integer DEFAULT 1 NOT NULL,
	`active_devices` integer DEFAULT 0 NOT NULL,
	`auto_renew` integer DEFAULT false NOT NULL,
	`entitlements` text DEFAULT '{}' NOT NULL,
	`limits` text DEFAULT '{}' NOT NULL,
	`revoked_at` text,
	`revocation_reason` text,
	`last_validated_at` text,
	`metadata` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lic_number_idx` ON `shranix_licenses` (`license_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `lic_public_id_idx` ON `shranix_licenses` (`license_public_id`);--> statement-breakpoint
CREATE INDEX `lic_customer_idx` ON `shranix_licenses` (`customer_id`);--> statement-breakpoint
CREATE INDEX `lic_subscription_idx` ON `shranix_licenses` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `lic_status_idx` ON `shranix_licenses` (`status`);--> statement-breakpoint
CREATE INDEX `lic_expires_idx` ON `shranix_licenses` (`expires_at`);