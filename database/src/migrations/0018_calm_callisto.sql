CREATE TABLE `shranix_communication_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`campaign_name` text NOT NULL,
	`channel` text NOT NULL,
	`template_code` text,
	`audience` text,
	`recipient_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`scheduled_at` text,
	`started_at` text,
	`completed_at` text,
	`sent_count` integer DEFAULT 0 NOT NULL,
	`delivered_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `comm_camp_status_idx` ON `shranix_communication_campaigns` (`status`);--> statement-breakpoint
CREATE TABLE `shranix_communication_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`channel` text NOT NULL,
	`category` text DEFAULT 'system' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`preferred` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comm_pref_entity_idx` ON `shranix_communication_preferences` (`entity_type`,`entity_id`,`channel`,`category`);--> statement-breakpoint
CREATE TABLE `shranix_communication_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`template_code` text NOT NULL,
	`template_name` text NOT NULL,
	`channel` text NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`html_body` text,
	`variables` text,
	`language` text DEFAULT 'en' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`category` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comm_tpl_code_idx` ON `shranix_communication_templates` (`template_code`,`language`);--> statement-breakpoint
CREATE INDEX `comm_tpl_channel_idx` ON `shranix_communication_templates` (`channel`);--> statement-breakpoint
CREATE TABLE `shranix_communications` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`channel` text NOT NULL,
	`template_code` text,
	`template_name` text,
	`recipient_type` text,
	`recipient_id` text,
	`recipient_address` text,
	`subject` text,
	`message_body` text,
	`reference_type` text,
	`reference_id` text,
	`reference_number` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`provider` text,
	`provider_message_id` text,
	`provider_response` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`last_attempt_at` text,
	`next_retry_at` text,
	`failure_reason` text,
	`scheduled_at` text,
	`sent_at` text,
	`delivered_at` text,
	`read_at` text,
	`failed_at` text,
	`batch_id` text,
	`attachment_refs` text,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `comm_log_status_idx` ON `shranix_communications` (`status`);--> statement-breakpoint
CREATE INDEX `comm_log_channel_idx` ON `shranix_communications` (`channel`);--> statement-breakpoint
CREATE INDEX `comm_log_ref_idx` ON `shranix_communications` (`reference_type`,`reference_id`);--> statement-breakpoint
CREATE INDEX `comm_log_recipient_idx` ON `shranix_communications` (`recipient_type`,`recipient_id`);--> statement-breakpoint
CREATE INDEX `comm_log_scheduled_idx` ON `shranix_communications` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `comm_log_batch_idx` ON `shranix_communications` (`batch_id`);