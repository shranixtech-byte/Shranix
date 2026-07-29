CREATE TABLE `shranix_digital_signatures` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`document_id` text NOT NULL,
	`document_version_id` text,
	`signer_id` text NOT NULL,
	`signature_type` text DEFAULT 'approval' NOT NULL,
	`signature` text,
	`certificate_hash` text,
	`is_verified` integer DEFAULT false NOT NULL,
	`verification_date` text,
	`signed_at` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`notes` text,
	`level` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dms_sig_doc_idx` ON `shranix_digital_signatures` (`document_id`,`signer_id`);--> statement-breakpoint
CREATE TABLE `shranix_document_access_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`document_id` text NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`timestamp` text NOT NULL,
	`details` text
);
--> statement-breakpoint
CREATE TABLE `shranix_document_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`description` text,
	`path` text,
	`level` integer DEFAULT 0 NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE TABLE `shranix_document_tag_junction` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`tag_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_document_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `shranix_document_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`document_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`is_major` integer DEFAULT false NOT NULL,
	`storage_path` text NOT NULL,
	`file_size` integer DEFAULT 0 NOT NULL,
	`checksum` text,
	`change_notes` text,
	`author_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dms_version_doc_idx` ON `shranix_document_versions` (`document_id`,`version_number`);--> statement-breakpoint
CREATE TABLE `shranix_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`document_number` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text,
	`document_type` text,
	`mime_type` text,
	`file_size` integer DEFAULT 0 NOT NULL,
	`file_extension` text,
	`storage_path` text NOT NULL,
	`checksum` text,
	`folder_id` text,
	`tags` text,
	`metadata` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`retention_policy` text,
	`retention_days` integer,
	`expiry_date` text,
	`archive_date` text,
	`legal_hold` integer DEFAULT false NOT NULL,
	`is_encrypted` integer DEFAULT false NOT NULL,
	`current_version` integer DEFAULT 1 NOT NULL,
	`linked_module` text,
	`linked_entity_id` text,
	`linked_entity_number` text,
	`owner_id` text,
	`department_id` text,
	`branch_id` text,
	`company_id` text,
	`warehouse_id` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dms_doc_number_idx` ON `shranix_documents` (`document_number`);--> statement-breakpoint
CREATE TABLE `shranix_ocr_results` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`document_id` text NOT NULL,
	`document_version_id` text,
	`raw_text` text,
	`processed_text` text,
	`confidence` real DEFAULT 0 NOT NULL,
	`invoice_number` text,
	`po_number` text,
	`supplier_name` text,
	`customer_name` text,
	`gst_number` text,
	`pan_number` text,
	`document_date` text,
	`due_date` text,
	`total_amount` real,
	`tax_amount` real,
	`hsn_codes` text,
	`item_names` text,
	`quantities` text,
	`engine` text DEFAULT 'tesseract' NOT NULL,
	`processing_time` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text
);
