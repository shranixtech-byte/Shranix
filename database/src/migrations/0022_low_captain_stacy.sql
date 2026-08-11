CREATE TABLE `shranix_portal_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`portal_user_id` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` text DEFAULT 'info' NOT NULL,
	`document_type` text,
	`document_id` text,
	`is_read` integer DEFAULT false NOT NULL,
	`read_at` text,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `pn_user_idx` ON `shranix_portal_notifications` (`portal_user_id`);--> statement-breakpoint
CREATE INDEX `pn_read_idx` ON `shranix_portal_notifications` (`portal_user_id`,`is_read`);--> statement-breakpoint
CREATE TABLE `shranix_portal_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`payment_number` text NOT NULL,
	`customer_id` text NOT NULL,
	`portal_user_id` text NOT NULL,
	`invoice_id` text,
	`amount` real DEFAULT 0 NOT NULL,
	`mode` text DEFAULT 'upi' NOT NULL,
	`gateway_ref` text,
	`status` text DEFAULT 'initiated' NOT NULL,
	`idempotency_key` text NOT NULL,
	`initiated_at` text NOT NULL,
	`completed_at` text,
	`failure_reason` text,
	`verification_payload` text,
	`sales_payment_id` text,
	`ip_address` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pp_number_idx` ON `shranix_portal_payments` (`payment_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `pp_idem_idx` ON `shranix_portal_payments` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `pp_customer_idx` ON `shranix_portal_payments` (`customer_id`);--> statement-breakpoint
CREATE INDEX `pp_status_idx` ON `shranix_portal_payments` (`status`);--> statement-breakpoint
CREATE INDEX `pp_invoice_idx` ON `shranix_portal_payments` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `shranix_portal_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`portal_user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`ip_address` text,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `prt_user_idx` ON `shranix_portal_reset_tokens` (`portal_user_id`);--> statement-breakpoint
CREATE INDEX `prt_used_idx` ON `shranix_portal_reset_tokens` (`used_at`);--> statement-breakpoint
CREATE TABLE `shranix_portal_ticket_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`ticket_id` text NOT NULL,
	`portal_user_id` text,
	`internal_user_id` text,
	`message` text NOT NULL,
	`is_internal` integer DEFAULT false NOT NULL,
	`attachment` text,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `ptm_ticket_idx` ON `shranix_portal_ticket_messages` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `ptm_created_idx` ON `shranix_portal_ticket_messages` (`created_at`);--> statement-breakpoint
CREATE TABLE `shranix_portal_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`ticket_number` text NOT NULL,
	`customer_id` text NOT NULL,
	`portal_user_id` text NOT NULL,
	`contact_name` text,
	`contact_mobile` text,
	`contact_email` text,
	`subject` text NOT NULL,
	`category` text DEFAULT 'general' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`description` text,
	`attachment` text,
	`status` text DEFAULT 'open' NOT NULL,
	`assigned_to` text,
	`resolved_at` text,
	`closed_at` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pt_number_idx` ON `shranix_portal_tickets` (`ticket_number`);--> statement-breakpoint
CREATE INDEX `pt_customer_idx` ON `shranix_portal_tickets` (`customer_id`);--> statement-breakpoint
CREATE INDEX `pt_status_idx` ON `shranix_portal_tickets` (`status`);--> statement-breakpoint
CREATE INDEX `pt_assigned_idx` ON `shranix_portal_tickets` (`assigned_to`);--> statement-breakpoint
CREATE TABLE `shranix_portal_users` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`customer_id` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`mobile` text,
	`role` text DEFAULT 'viewer' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`is_verified` integer DEFAULT false NOT NULL,
	`verified_at` text,
	`failed_login_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`last_login_at` text,
	`last_login_ip` text,
	`token_version` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pu_email_idx` ON `shranix_portal_users` (`email`);--> statement-breakpoint
CREATE INDEX `pu_customer_idx` ON `shranix_portal_users` (`customer_id`);--> statement-breakpoint
CREATE INDEX `pu_status_idx` ON `shranix_portal_users` (`status`);