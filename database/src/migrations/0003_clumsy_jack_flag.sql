CREATE TABLE `shranix_adjustment_items` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`adjustment_id` text NOT NULL,
	`item_id` text NOT NULL,
	`variant_id` text,
	`batch_id` text,
	`batch_no` text,
	`lot_no` text,
	`serial_no` text,
	`uom` text,
	`system_qty` real DEFAULT 0 NOT NULL,
	`physical_qty` real DEFAULT 0 NOT NULL,
	`adjustment_qty` real DEFAULT 0 NOT NULL,
	`unit_cost` real DEFAULT 0 NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`reason` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `adj_item_idx` ON `shranix_adjustment_items` (`adjustment_id`,`item_id`,`batch_no`);--> statement-breakpoint
CREATE TABLE `shranix_approval_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`approval_id` text NOT NULL,
	`user_id` text NOT NULL,
	`user_name` text,
	`comment` text NOT NULL,
	`is_internal` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_approval_history` (
	`id` text PRIMARY KEY NOT NULL,
	`approval_id` text NOT NULL,
	`action` text NOT NULL,
	`action_by` text NOT NULL,
	`action_by_name` text,
	`from_status` text,
	`to_status` text NOT NULL,
	`level` integer DEFAULT 0 NOT NULL,
	`comment` text,
	`timestamp` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_approval_matrices` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`document_type` text NOT NULL,
	`levels` text DEFAULT 'single' NOT NULL,
	`level_count` integer DEFAULT 1 NOT NULL,
	`approvers` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_approval_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`approval_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`recipient_role` text,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_approval_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`document_type` text NOT NULL,
	`field` text NOT NULL,
	`operator` text NOT NULL,
	`value` text NOT NULL,
	`value2` text,
	`approver_role` text NOT NULL,
	`approval_level` integer DEFAULT 1 NOT NULL,
	`priority` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_batch_genealogy` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_batch_id` text NOT NULL,
	`child_batch_id` text NOT NULL,
	`relationship_type` text DEFAULT 'production' NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_batch_lots` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`lot_code` text NOT NULL,
	`lot_name` text,
	`batch_id` text NOT NULL,
	`parent_lot_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `batch_lots_code_idx` ON `shranix_batch_lots` (`lot_code`);--> statement-breakpoint
CREATE TABLE `shranix_batch_master` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`batch_no` text NOT NULL,
	`lot_no` text,
	`item_id` text NOT NULL,
	`warehouse_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`mfg_date` text,
	`packing_date` text,
	`exp_date` text,
	`best_before_date` text,
	`retest_date` text,
	`country_of_origin` text DEFAULT 'India' NOT NULL,
	`manufacturer` text,
	`supplier_batch_no` text,
	`internal_batch_no` text,
	`quantity` real DEFAULT 0 NOT NULL,
	`reserved_quantity` real DEFAULT 0 NOT NULL,
	`available_quantity` real DEFAULT 0 NOT NULL,
	`committed_quantity` real DEFAULT 0 NOT NULL,
	`purchase_rate` real DEFAULT 0 NOT NULL,
	`mrp` real DEFAULT 0 NOT NULL,
	`selling_price` real,
	`crop_season` text,
	`seed_variety` text,
	`farm_source` text,
	`farmer_name` text,
	`harvest_date` text,
	`packing_center` text,
	`organic` integer DEFAULT false NOT NULL,
	`certification_number` text,
	`quality_status` text DEFAULT 'pending_inspection' NOT NULL,
	`approved_by` text,
	`rejected_by` text,
	`inspection_date` text,
	`remarks` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `batch_master_no_idx` ON `shranix_batch_master` (`batch_no`,`item_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `batch_master_lot_idx` ON `shranix_batch_master` (`lot_no`);--> statement-breakpoint
CREATE TABLE `shranix_credit_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`credit_note_number` text NOT NULL,
	`financial_year` text,
	`customer_id` text NOT NULL,
	`original_invoice_id` text,
	`original_invoice_number` text,
	`reference_date` text,
	`return_amount` real DEFAULT 0 NOT NULL,
	`cgst_total` real DEFAULT 0 NOT NULL,
	`sgst_total` real DEFAULT 0 NOT NULL,
	`igst_total` real DEFAULT 0 NOT NULL,
	`cess_total` real DEFAULT 0 NOT NULL,
	`round_off` real DEFAULT 0 NOT NULL,
	`narration` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text
);
--> statement-breakpoint
CREATE TABLE `shranix_credit_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`customer_id` text NOT NULL,
	`override_by` text NOT NULL,
	`override_by_name` text,
	`override_role` text NOT NULL,
	`reason` text NOT NULL,
	`old_limit` real DEFAULT 0 NOT NULL,
	`new_limit` real DEFAULT 0 NOT NULL,
	`approved_by` text,
	`timestamp` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_credit_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`customer_id` text NOT NULL,
	`customer_name` text,
	`customer_code` text,
	`credit_limit` real DEFAULT 0 NOT NULL,
	`credit_days` integer DEFAULT 0 NOT NULL,
	`security_deposit` real DEFAULT 0 NOT NULL,
	`opening_balance` real DEFAULT 0 NOT NULL,
	`outstanding` real DEFAULT 0 NOT NULL,
	`available_credit` real DEFAULT 0 NOT NULL,
	`blocked_amount` real DEFAULT 0 NOT NULL,
	`overdue_amount` real DEFAULT 0 NOT NULL,
	`max_invoice_amount` real DEFAULT 0 NOT NULL,
	`preferred_payment_mode` text DEFAULT 'credit' NOT NULL,
	`credit_rating` text DEFAULT 'A' NOT NULL,
	`risk_category` text DEFAULT 'low' NOT NULL,
	`health_score` integer DEFAULT 100 NOT NULL,
	`is_blocked` integer DEFAULT false NOT NULL,
	`block_reason` text,
	`warning_level` text DEFAULT 'green' NOT NULL,
	`last_payment_date` text,
	`average_payment_days` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_debit_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`debit_note_number` text NOT NULL,
	`financial_year` text,
	`customer_id` text NOT NULL,
	`original_invoice_id` text,
	`original_invoice_number` text,
	`debit_note_date` text,
	`debit_type` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`gst_amount` real DEFAULT 0 NOT NULL,
	`narration` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text
);
--> statement-breakpoint
CREATE TABLE `shranix_inv_stock_balance` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`item_id` text NOT NULL,
	`variant_id` text,
	`batch_id` text,
	`batch_no` text,
	`warehouse_id` text NOT NULL,
	`zone_id` text,
	`rack_id` text,
	`on_hand` real DEFAULT 0 NOT NULL,
	`available` real DEFAULT 0 NOT NULL,
	`reserved` real DEFAULT 0 NOT NULL,
	`committed` real DEFAULT 0 NOT NULL,
	`allocated` real DEFAULT 0 NOT NULL,
	`damaged` real DEFAULT 0 NOT NULL,
	`blocked` real DEFAULT 0 NOT NULL,
	`in_transit` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inv_stock_balance_idx` ON `shranix_inv_stock_balance` (`warehouse_id`,`item_id`);--> statement-breakpoint
CREATE TABLE `shranix_inv_stock_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`entry_number` text NOT NULL,
	`transaction_number` text,
	`reference_number` text,
	`transaction_type` text NOT NULL,
	`direction` text NOT NULL,
	`transaction_date` text,
	`posting_date` text,
	`item_id` text NOT NULL,
	`variant_id` text,
	`batch_id` text,
	`batch_no` text,
	`lot_no` text,
	`serial_no` text,
	`warehouse_id` text,
	`zone_id` text,
	`rack_id` text,
	`shelf_id` text,
	`bin_id` text,
	`from_warehouse_id` text,
	`to_warehouse_id` text,
	`uom` text,
	`quantity` real NOT NULL,
	`unit_cost` real DEFAULT 0 NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`balance_quantity` real DEFAULT 0 NOT NULL,
	`balance_cost` real DEFAULT 0 NOT NULL,
	`reversal_ref_id` text,
	`is_reversal` integer DEFAULT false NOT NULL,
	`document_ref` text,
	`document_type` text,
	`remarks` text,
	`created_by` text,
	`approved_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inv_ledger_entry_no_idx` ON `shranix_inv_stock_ledger` (`entry_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `inv_ledger_ref_idx` ON `shranix_inv_stock_ledger` (`reference_number`);--> statement-breakpoint
CREATE TABLE `shranix_inv_stock_reservation` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`reservation_number` text NOT NULL,
	`item_id` text NOT NULL,
	`batch_id` text,
	`warehouse_id` text NOT NULL,
	`quantity` real NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`reference_type` text,
	`reference_id` text,
	`expiry_date` text,
	`created_by` text,
	`released_by` text,
	`released_at` text,
	`remarks` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inv_reservation_no_idx` ON `shranix_inv_stock_reservation` (`reservation_number`);--> statement-breakpoint
CREATE TABLE `shranix_item_packaging` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`item_id` text NOT NULL,
	`level` text DEFAULT 'primary' NOT NULL,
	`name` text NOT NULL,
	`weight` real,
	`weight_unit` text,
	`length` real,
	`width` real,
	`height` real,
	`volume` real,
	`volume_unit` text,
	`quantity` real DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_physical_count_headers` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`count_number` text NOT NULL,
	`count_date` text,
	`count_type` text DEFAULT 'full_warehouse' NOT NULL,
	`warehouse_id` text NOT NULL,
	`zone_id` text,
	`rack_id` text,
	`shelf_id` text,
	`bin_id` text,
	`department` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`assigned_to` text,
	`assigned_date` text,
	`verifier` text,
	`verified_by` text,
	`verified_date` text,
	`approved_by` text,
	`approved_date` text,
	`completed_by` text,
	`completed_date` text,
	`total_items` integer DEFAULT 0 NOT NULL,
	`total_system_qty` real DEFAULT 0 NOT NULL,
	`total_counted_qty` real DEFAULT 0 NOT NULL,
	`total_variance` real DEFAULT 0 NOT NULL,
	`variance_percent` real DEFAULT 0 NOT NULL,
	`created_by` text,
	`supervisor` text,
	`remarks` text,
	`adjustment_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `physical_count_no_idx` ON `shranix_physical_count_headers` (`count_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `physical_count_wh_idx` ON `shranix_physical_count_headers` (`warehouse_id`,`count_date`);--> statement-breakpoint
CREATE TABLE `shranix_physical_count_items` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`count_id` text NOT NULL,
	`item_id` text NOT NULL,
	`variant_id` text,
	`batch_id` text,
	`batch_no` text,
	`lot_no` text,
	`serial_no` text,
	`uom` text,
	`system_qty` real DEFAULT 0 NOT NULL,
	`counted_qty` real DEFAULT 0,
	`recount_qty` real DEFAULT 0,
	`verified_qty` real DEFAULT 0,
	`final_qty` real DEFAULT 0,
	`variance` real DEFAULT 0 NOT NULL,
	`variance_percent` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`counter` text,
	`verifier` text,
	`count_method` text DEFAULT 'manual',
	`remarks` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `physical_count_item_idx` ON `shranix_physical_count_items` (`count_id`,`item_id`,`batch_no`);--> statement-breakpoint
CREATE TABLE `shranix_product_attributes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`item_id` text NOT NULL,
	`variant_id` text,
	`attribute_name` text NOT NULL,
	`attribute_value` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_attr_item_idx` ON `shranix_product_attributes` (`item_id`,`attribute_name`);--> statement-breakpoint
CREATE TABLE `shranix_pr_items` (
	`id` text PRIMARY KEY NOT NULL,
	`pr_id` text NOT NULL,
	`item_id` text NOT NULL,
	`variant_id` text,
	`description` text,
	`quantity` real DEFAULT 1 NOT NULL,
	`estimated_rate` real DEFAULT 0 NOT NULL,
	`estimated_amount` real DEFAULT 0 NOT NULL,
	`remarks` text
);
--> statement-breakpoint
CREATE TABLE `shranix_purchase_requisitions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`pr_number` text NOT NULL,
	`department` text,
	`requested_by` text,
	`required_date` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`remarks` text,
	`approved_by` text,
	`approved_at` text,
	`rejection_reason` text,
	`financial_year_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pr_requisition_number_idx` ON `shranix_purchase_requisitions` (`pr_number`);--> statement-breakpoint
CREATE TABLE `shranix_purchase_return_items` (
	`id` text PRIMARY KEY NOT NULL,
	`return_id` text NOT NULL,
	`item_id` text NOT NULL,
	`batch_id` text,
	`batch_no` text,
	`quantity` real NOT NULL,
	`rate` real DEFAULT 0 NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`reason` text,
	`warehouse_id` text,
	`remarks` text
);
--> statement-breakpoint
CREATE TABLE `shranix_serial_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`serial_id` text NOT NULL,
	`document_type` text NOT NULL,
	`file_name` text,
	`file_url` text,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_serial_history` (
	`id` text PRIMARY KEY NOT NULL,
	`serial_id` text NOT NULL,
	`event_type` text NOT NULL,
	`reference_type` text,
	`reference_id` text,
	`from_location` text,
	`to_location` text,
	`remarks` text,
	`created_by` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_serial_installation` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`serial_id` text NOT NULL,
	`installation_date` text,
	`commission_date` text,
	`installed_by` text,
	`customer_id` text,
	`customer_name` text,
	`location` text,
	`technician` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_serial_master` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`serial_no` text NOT NULL,
	`internal_serial_no` text,
	`manufacturer_serial_no` text,
	`supplier_serial_no` text,
	`item_id` text NOT NULL,
	`batch_id` text,
	`warehouse_id` text,
	`current_location` text,
	`status` text DEFAULT 'available' NOT NULL,
	`barcode` text,
	`qr_code` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `serial_master_no_idx` ON `shranix_serial_master` (`serial_no`);--> statement-breakpoint
CREATE UNIQUE INDEX `serial_master_internal_idx` ON `shranix_serial_master` (`internal_serial_no`);--> statement-breakpoint
CREATE UNIQUE INDEX `serial_master_manufacturer_idx` ON `shranix_serial_master` (`manufacturer_serial_no`);--> statement-breakpoint
CREATE UNIQUE INDEX `serial_master_barcode_idx` ON `shranix_serial_master` (`barcode`);--> statement-breakpoint
CREATE TABLE `shranix_serial_rma` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`serial_id` text NOT NULL,
	`rma_number` text NOT NULL,
	`rma_type` text DEFAULT 'repair' NOT NULL,
	`rma_status` text DEFAULT 'pending' NOT NULL,
	`reason` text,
	`customer_id` text,
	`approved_by` text,
	`approved_date` text,
	`completed_date` text,
	`remarks` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `serial_rma_number_idx` ON `shranix_serial_rma` (`rma_number`);--> statement-breakpoint
CREATE TABLE `shranix_serial_relationship` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_serial_id` text NOT NULL,
	`child_serial_id` text NOT NULL,
	`relationship_type` text DEFAULT 'contains' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_serial_service` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`serial_id` text NOT NULL,
	`service_date` text,
	`service_type` text DEFAULT 'repair' NOT NULL,
	`description` text,
	`technician` text,
	`spare_parts_used` text,
	`cost` real DEFAULT 0 NOT NULL,
	`remarks` text
);
--> statement-breakpoint
CREATE TABLE `shranix_serial_warranty` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`serial_id` text NOT NULL,
	`warranty_start` text,
	`warranty_end` text,
	`warranty_type` text DEFAULT 'manufacturer' NOT NULL,
	`warranty_status` text DEFAULT 'active' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `serial_warranty_serial_idx` ON `shranix_serial_warranty` (`serial_id`);--> statement-breakpoint
CREATE TABLE `shranix_stock_adjustments` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`adjustment_number` text NOT NULL,
	`adjustment_date` text,
	`adjustment_type` text DEFAULT 'manual_correction' NOT NULL,
	`reason_code` text,
	`warehouse_id` text NOT NULL,
	`zone_id` text,
	`rack_id` text,
	`shelf_id` text,
	`bin_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`approved_by` text,
	`approved_date` text,
	`approval_notes` text,
	`posted_by` text,
	`posted_date` text,
	`reference_number` text,
	`created_by` text,
	`remarks` text,
	`reversal_of_id` text,
	`is_reversal` integer DEFAULT false NOT NULL,
	`reversal_reason` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_adj_no_idx` ON `shranix_stock_adjustments` (`adjustment_number`);--> statement-breakpoint
CREATE TABLE `shranix_stock_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`item_id` text NOT NULL,
	`batch_id` text,
	`batch_no` text,
	`warehouse_id` text,
	`transaction_type` text NOT NULL,
	`document_ref` text,
	`document_type` text,
	`quantity` real NOT NULL,
	`before_qty` real DEFAULT 0 NOT NULL,
	`after_qty` real DEFAULT 0 NOT NULL,
	`rate` real DEFAULT 0 NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`created_by` text,
	`remarks` text
);
--> statement-breakpoint
CREATE TABLE `shranix_stock_transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`transfer_number` text NOT NULL,
	`transfer_date` text,
	`transfer_type` text DEFAULT 'warehouse' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`source_warehouse_id` text NOT NULL,
	`destination_warehouse_id` text NOT NULL,
	`source_zone_id` text,
	`destination_zone_id` text,
	`source_rack_id` text,
	`destination_rack_id` text,
	`source_shelf_id` text,
	`destination_shelf_id` text,
	`source_bin_id` text,
	`destination_bin_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`approval_level` text,
	`approved_by` text,
	`approved_date` text,
	`approval_notes` text,
	`dispatch_date` text,
	`dispatched_by` text,
	`expected_arrival` text,
	`received_date` text,
	`received_by` text,
	`transit_warehouse_id` text,
	`transit_notes` text,
	`created_by` text,
	`notes` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_transfer_no_idx` ON `shranix_stock_transfers` (`transfer_number`);--> statement-breakpoint
CREATE TABLE `shranix_suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`code` text,
	`name` text NOT NULL,
	`gstin` text,
	`pan` text,
	`contact_person` text,
	`mobile` text,
	`email` text,
	`address` text,
	`state` text,
	`district` text,
	`city` text,
	`pin` text,
	`credit_limit` real DEFAULT 0 NOT NULL,
	`credit_days` integer DEFAULT 0 NOT NULL,
	`bank_name` text,
	`bank_account_no` text,
	`bank_ifsc` text,
	`bank_branch` text,
	`status` text DEFAULT 'active' NOT NULL,
	`remarks` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supplier_code_idx` ON `shranix_suppliers` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `supplier_name_idx` ON `shranix_suppliers` (`name`);--> statement-breakpoint
CREATE TABLE `shranix_transfer_items` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`transfer_id` text NOT NULL,
	`item_id` text NOT NULL,
	`variant_id` text,
	`batch_id` text,
	`batch_no` text,
	`lot_no` text,
	`serial_no` text,
	`uom` text,
	`requested_qty` real DEFAULT 0 NOT NULL,
	`approved_qty` real DEFAULT 0 NOT NULL,
	`transferred_qty` real DEFAULT 0 NOT NULL,
	`received_qty` real DEFAULT 0 NOT NULL,
	`rejected_qty` real DEFAULT 0 NOT NULL,
	`unit_cost` real DEFAULT 0 NOT NULL,
	`remarks` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transfer_item_idx` ON `shranix_transfer_items` (`transfer_id`,`item_id`,`batch_no`);--> statement-breakpoint
CREATE TABLE `shranix_uom_conversions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`from_unit_id` text NOT NULL,
	`to_unit_id` text NOT NULL,
	`factor` real DEFAULT 1 NOT NULL,
	`bidirectional` integer DEFAULT true NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`item_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uom_conversion_idx` ON `shranix_uom_conversions` (`from_unit_id`,`to_unit_id`,`item_id`);--> statement-breakpoint
CREATE TABLE `shranix_warehouse_bins` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`shelf_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text,
	`barcode` text,
	`capacity` real,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warehouse_bin_code_idx` ON `shranix_warehouse_bins` (`shelf_id`,`code`);--> statement-breakpoint
CREATE TABLE `shranix_warehouse_racks` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`zone_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`capacity` real,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warehouse_rack_code_idx` ON `shranix_warehouse_racks` (`zone_id`,`code`);--> statement-breakpoint
CREATE TABLE `shranix_warehouse_shelves` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`rack_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`max_weight` real,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warehouse_shelf_code_idx` ON `shranix_warehouse_shelves` (`rack_id`,`code`);--> statement-breakpoint
CREATE TABLE `shranix_warehouse_stock` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`item_id` text NOT NULL,
	`variant_id` text,
	`batch_id` text,
	`batch_no` text,
	`warehouse_id` text NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`reserved_quantity` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warehouse_stock_idx` ON `shranix_warehouse_stock` (`warehouse_id`,`item_id`);--> statement-breakpoint
CREATE TABLE `shranix_warehouse_zones` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`warehouse_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warehouse_zone_code_idx` ON `shranix_warehouse_zones` (`warehouse_id`,`code`);--> statement-breakpoint
DROP INDEX IF EXISTS `sales_settings_company_idx`;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `upi_id` text;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_shranix_sales_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`document_type` text NOT NULL,
	`document_id` text NOT NULL,
	`document_number` text,
	`customer_id` text,
	`customer_name` text,
	`amount` real DEFAULT 0 NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`discount_percent` real DEFAULT 0 NOT NULL,
	`gst_amount` real DEFAULT 0 NOT NULL,
	`created_by` text NOT NULL,
	`created_by_name` text,
	`current_level` integer DEFAULT 1 NOT NULL,
	`total_levels` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`risk` text DEFAULT 'low' NOT NULL,
	`credit_status` text DEFAULT 'normal' NOT NULL,
	`assigned_to` text,
	`assigned_to_name` text,
	`is_overdue` integer DEFAULT false NOT NULL,
	`due_date` text,
	`requested_by` text,
	`approved_by` text,
	`approval_date` text,
	`comments` text,
	`approval_level` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
DROP TABLE `shranix_sales_approvals`;--> statement-breakpoint
ALTER TABLE `__new_shranix_sales_approvals` RENAME TO `shranix_sales_approvals`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `shranix_brands` ADD `brand_code` text;--> statement-breakpoint
ALTER TABLE `shranix_brands` ADD `manufacturer` text;--> statement-breakpoint
ALTER TABLE `shranix_brands` ADD `country` text DEFAULT 'India' NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_brands` ADD `logo` text;--> statement-breakpoint
CREATE UNIQUE INDEX `brands_code_idx` ON `shranix_brands` (`brand_code`);--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `short_name` text;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `manufacturer` text;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `manufacturer_code` text;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `purchase_unit_id` text;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `sales_unit_id` text;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `stock_unit_id` text;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `length` real;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `width` real;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `height` real;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `volume` real;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `volume_unit` text;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `shelf_life` text;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `seasonal` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `organic` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `crop_season` text;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `variety` text;--> statement-breakpoint
ALTER TABLE `shranix_sales_invoices` ADD `freight` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_invoices` ADD `payment_terms` text DEFAULT 'cash' NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_warehouses` ADD `warehouse_type` text DEFAULT 'storage' NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_warehouses` ADD `district` text;--> statement-breakpoint
ALTER TABLE `shranix_warehouses` ADD `pincode` text;--> statement-breakpoint
ALTER TABLE `shranix_warehouses` ADD `contact_person` text;--> statement-breakpoint
ALTER TABLE `shranix_warehouses` ADD `mobile` text;--> statement-breakpoint
ALTER TABLE `shranix_warehouses` ADD `email` text;--> statement-breakpoint
ALTER TABLE `shranix_warehouses` ADD `gstin` text;--> statement-breakpoint
ALTER TABLE `shranix_warehouses` ADD `remarks` text;--> statement-breakpoint
CREATE TABLE `shranix_bank_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`company_id` text,
	`bank_name` text NOT NULL,
	`account_holder_name` text,
	`account_number` text,
	`account_type` text DEFAULT 'savings' NOT NULL,
	`ifsc` text,
	`swift_code` text,
	`upi_id` text,
	`cheque_format` text,
	`is_default` integer DEFAULT false NOT NULL,
	`neft_enabled` integer DEFAULT true NOT NULL,
	`rtgs_enabled` integer DEFAULT true NOT NULL,
	`imps_enabled` integer DEFAULT true NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` text,
	`updated_by` text
);--> statement-breakpoint
CREATE INDEX `bank_acct_company_idx` ON `shranix_bank_accounts` (`company_id`);--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `invoice_suffix` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `print_format` text NOT NULL DEFAULT 'a4_portrait';--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `duplicate_copy` integer NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `transport_copy` integer NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `show_qr` integer NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `show_hsn` integer NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `show_batch` integer NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `show_expiry` integer NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `show_discount` integer NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `show_gst` integer NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `show_barcode` integer NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `shranix_inventory_settings` ADD `lot_tracking` integer NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `shranix_inventory_settings` ADD `auto_barcode` integer NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `shranix_inventory_settings` ADD `auto_sku` integer NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `shranix_inventory_settings` ADD `low_stock_alert` integer NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `shranix_inventory_settings` ADD `low_stock_threshold` integer NOT NULL DEFAULT 5;--> statement-breakpoint
ALTER TABLE `shranix_inventory_settings` ADD `stock_reservation` integer NOT NULL DEFAULT true;