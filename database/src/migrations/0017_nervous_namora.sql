CREATE TABLE `shranix_call_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`lead_id` text,
	`customer_id` text,
	`phone` text,
	`direction` text DEFAULT 'outgoing' NOT NULL,
	`call_date` text NOT NULL,
	`call_time` text,
	`duration_seconds` integer DEFAULT 0 NOT NULL,
	`purpose` text,
	`outcome` text,
	`notes` text,
	`next_follow_up_at` text,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `crm_call_lead_idx` ON `shranix_call_logs` (`lead_id`);--> statement-breakpoint
CREATE INDEX `crm_call_date_idx` ON `shranix_call_logs` (`call_date`);--> statement-breakpoint
CREATE TABLE `shranix_crm_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`lead_id` text,
	`customer_id` text,
	`opportunity_id` text,
	`quotation_id` text,
	`sales_order_id` text,
	`note` text NOT NULL,
	`is_private` integer DEFAULT false NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE INDEX `crm_note_lead_idx` ON `shranix_crm_notes` (`lead_id`);--> statement-breakpoint
CREATE INDEX `crm_note_customer_idx` ON `shranix_crm_notes` (`customer_id`);--> statement-breakpoint
CREATE TABLE `shranix_crm_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`lead_id` text,
	`customer_id` text,
	`assigned_to` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`due_date` text,
	`status` text DEFAULT 'open' NOT NULL,
	`completed_at` text,
	`completed_by` text,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `crm_task_due_idx` ON `shranix_crm_tasks` (`due_date`);--> statement-breakpoint
CREATE INDEX `crm_task_status_idx` ON `shranix_crm_tasks` (`status`);--> statement-breakpoint
CREATE TABLE `shranix_follow_ups` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`lead_id` text,
	`customer_id` text,
	`assigned_to` text,
	`follow_up_type` text DEFAULT 'phone' NOT NULL,
	`scheduled_at` text NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`purpose` text,
	`notes` text,
	`outcome` text,
	`next_follow_up_at` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`completed_at` text,
	`completed_by` text,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `crm_fu_scheduled_idx` ON `shranix_follow_ups` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `crm_fu_status_idx` ON `shranix_follow_ups` (`status`);--> statement-breakpoint
CREATE INDEX `crm_fu_lead_idx` ON `shranix_follow_ups` (`lead_id`);--> statement-breakpoint
CREATE TABLE `shranix_lead_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`lead_id` text,
	`customer_id` text,
	`activity_type` text NOT NULL,
	`title` text,
	`description` text,
	`reference_type` text,
	`reference_id` text,
	`user_id` text,
	`happened_at` text NOT NULL,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `crm_act_lead_idx` ON `shranix_lead_activities` (`lead_id`);--> statement-breakpoint
CREATE INDEX `crm_act_customer_idx` ON `shranix_lead_activities` (`customer_id`);--> statement-breakpoint
CREATE INDEX `crm_act_happened_idx` ON `shranix_lead_activities` (`happened_at`);--> statement-breakpoint
CREATE TABLE `shranix_lead_conversions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`lead_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`customer_code` text,
	`match_method` text DEFAULT 'new' NOT NULL,
	`matched_customer_id` text,
	`converted_by` text,
	`converted_at` text NOT NULL,
	`details` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm_conv_lead_idx` ON `shranix_lead_conversions` (`lead_id`);--> statement-breakpoint
CREATE TABLE `shranix_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`lead_number` text NOT NULL,
	`lead_name` text NOT NULL,
	`company_name` text,
	`contact_person` text,
	`mobile` text,
	`alt_mobile` text,
	`whatsapp` text,
	`email` text,
	`address` text,
	`village` text,
	`taluka` text,
	`district` text,
	`state` text,
	`pincode` text,
	`source` text DEFAULT 'walk-in' NOT NULL,
	`lead_type` text DEFAULT 'individual' NOT NULL,
	`assigned_to` text,
	`assigned_by` text,
	`assigned_at` text,
	`expected_value` real DEFAULT 0 NOT NULL,
	`expected_close_date` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`score` real DEFAULT 0 NOT NULL,
	`score_level` text DEFAULT 'low' NOT NULL,
	`notes` text,
	`converted_to_customer` integer DEFAULT false NOT NULL,
	`converted_customer_id` text,
	`converted_at` text,
	`won_date` text,
	`won_value` real DEFAULT 0 NOT NULL,
	`lost_reason` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm_lead_number_idx` ON `shranix_leads` (`lead_number`);--> statement-breakpoint
CREATE INDEX `crm_lead_status_idx` ON `shranix_leads` (`status`);--> statement-breakpoint
CREATE INDEX `crm_lead_assigned_idx` ON `shranix_leads` (`assigned_to`);--> statement-breakpoint
CREATE TABLE `shranix_meetings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`title` text NOT NULL,
	`lead_id` text,
	`customer_id` text,
	`participants` text,
	`meeting_date` text NOT NULL,
	`meeting_time` text,
	`location` text,
	`purpose` text,
	`notes` text,
	`outcome` text,
	`next_action` text,
	`follow_up_at` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `crm_mtg_date_idx` ON `shranix_meetings` (`meeting_date`);--> statement-breakpoint
CREATE TABLE `shranix_opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`opportunity_number` text NOT NULL,
	`name` text NOT NULL,
	`lead_id` text,
	`customer_id` text,
	`estimated_value` real DEFAULT 0 NOT NULL,
	`probability` real DEFAULT 0 NOT NULL,
	`weighted_value` real DEFAULT 0 NOT NULL,
	`expected_close_date` text,
	`salesperson_id` text,
	`stage` text DEFAULT 'lead' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`notes` text,
	`won_at` text,
	`won_value` real DEFAULT 0 NOT NULL,
	`lost_reason` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm_opp_number_idx` ON `shranix_opportunities` (`opportunity_number`);--> statement-breakpoint
CREATE INDEX `crm_opp_stage_idx` ON `shranix_opportunities` (`stage`);