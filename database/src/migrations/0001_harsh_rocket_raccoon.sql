CREATE TABLE `shranix_account_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`alias` text,
	`type` text NOT NULL,
	`parent_id` text,
	`level` integer DEFAULT 0 NOT NULL,
	`path` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `acct_group_name_idx` ON `shranix_account_groups` (`name`);--> statement-breakpoint
CREATE TABLE `shranix_accounting_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`company_id` text,
	`fiscal_year_start` text,
	`fiscal_year_end` text,
	`current_financial_year_id` text,
	`default_cash_account_id` text,
	`default_bank_account_id` text,
	`default_sales_account_id` text,
	`default_purchase_account_id` text,
	`default_tax_account_id` text,
	`auto_voucher_number` integer DEFAULT true NOT NULL,
	`voucher_prefix` text DEFAULT 'JV-' NOT NULL,
	`voucher_next_number` integer DEFAULT 1 NOT NULL,
	`round_off_decimals` integer DEFAULT 2 NOT NULL,
	`allow_negative_balance` integer DEFAULT false NOT NULL,
	`enforce_debit_credit_equality` integer DEFAULT true NOT NULL,
	`require_approval` integer DEFAULT false NOT NULL,
	`approval_levels` integer DEFAULT 1 NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `acct_settings_company_idx` ON `shranix_accounting_settings` (`company_id`);--> statement-breakpoint
CREATE TABLE `shranix_approval_matrix` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`module` text NOT NULL,
	`document_type` text NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`min_amount` real DEFAULT 0 NOT NULL,
	`max_amount` real,
	`approval_type` text DEFAULT 'role' NOT NULL,
	`approver_role` text,
	`approver_user_id` text,
	`department_id` text,
	`condition` text,
	`is_sequential` integer DEFAULT true NOT NULL,
	`is_parallel` integer DEFAULT false NOT NULL,
	`required_approvals` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE INDEX `wf_matrix_module_doc_idx` ON `shranix_approval_matrix` (`module`,`document_type`);--> statement-breakpoint
CREATE TABLE `shranix_audit_details` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`audit_log_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`user_id` text,
	`user_name` text,
	`user_role` text,
	`ip_address` text,
	`user_agent` text,
	`old_values` text,
	`new_values` text,
	`changes` text,
	`timestamp` text NOT NULL,
	`module` text NOT NULL,
	`action_type` text NOT NULL,
	`status` text DEFAULT 'success' NOT NULL,
	`remarks` text,
	`session_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_timestamp_idx` ON `shranix_audit_details` (`timestamp`);--> statement-breakpoint
CREATE TABLE `shranix_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`user_id` text NOT NULL,
	`event` text NOT NULL,
	`resource` text,
	`action` text,
	`details` text,
	`ip_address` text,
	`user_agent` text,
	`status` text DEFAULT 'success' NOT NULL,
	`severity` text DEFAULT 'info' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_bank_book` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`bank_account_id` text NOT NULL,
	`entry_date` text NOT NULL,
	`voucher_type` text NOT NULL,
	`voucher_id` text,
	`voucher_number` text,
	`ledger_id` text,
	`party_id` text,
	`cheque_number` text,
	`cheque_date` text,
	`utr_number` text,
	`reference_number` text,
	`debit` real DEFAULT 0 NOT NULL,
	`credit` real DEFAULT 0 NOT NULL,
	`running_balance` real DEFAULT 0 NOT NULL,
	`reconciliation_status` text DEFAULT 'pending' NOT NULL,
	`reconciliation_date` text,
	`narration` text,
	`financial_year_id` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bank_book_date_idx` ON `shranix_bank_book` (`bank_account_id`,`entry_date`);--> statement-breakpoint
CREATE TABLE `shranix_branches` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`address` text,
	`city` text,
	`state` text,
	`phone` text,
	`email` text,
	`is_active` integer DEFAULT true NOT NULL,
	`company_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `branch_code_idx` ON `shranix_branches` (`code`);--> statement-breakpoint
CREATE TABLE `shranix_brands` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brands_name_idx` ON `shranix_brands` (`name`);--> statement-breakpoint
CREATE TABLE `shranix_cash_book` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`cash_account_id` text NOT NULL,
	`entry_date` text NOT NULL,
	`voucher_type` text NOT NULL,
	`voucher_id` text,
	`voucher_number` text,
	`ledger_id` text,
	`party_id` text,
	`debit` real DEFAULT 0 NOT NULL,
	`credit` real DEFAULT 0 NOT NULL,
	`running_balance` real DEFAULT 0 NOT NULL,
	`narration` text,
	`financial_year_id` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cash_book_date_idx` ON `shranix_cash_book` (`cash_account_id`,`entry_date`);--> statement-breakpoint
CREATE TABLE `shranix_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`parent_id` text,
	`type` text DEFAULT 'item' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_idx` ON `shranix_categories` (`name`);--> statement-breakpoint
CREATE TABLE `shranix_challan_items` (
	`id` text PRIMARY KEY NOT NULL,
	`challan_id` text NOT NULL,
	`order_item_id` text,
	`item_id` text NOT NULL,
	`variant_id` text,
	`quantity` real DEFAULT 0 NOT NULL,
	`delivered_quantity` real DEFAULT 0 NOT NULL,
	`rate` real DEFAULT 0 NOT NULL,
	`batch_no` text,
	`serial_numbers` text,
	`mfg_date` text,
	`exp_date` text,
	`warehouse_id` text,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `shranix_chart_of_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`account_code` text NOT NULL,
	`account_name` text NOT NULL,
	`account_type` text NOT NULL,
	`group_id` text NOT NULL,
	`opening_balance` real DEFAULT 0 NOT NULL,
	`opening_balance_type` text DEFAULT 'debit' NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`cost_center_required` integer DEFAULT false NOT NULL,
	`gst_applicable` integer DEFAULT false NOT NULL,
	`bank_reconciliation` integer DEFAULT false NOT NULL,
	`is_cash_account` integer DEFAULT false NOT NULL,
	`is_control_account` integer DEFAULT false NOT NULL,
	`allow_manual_posting` integer DEFAULT true NOT NULL,
	`description` text,
	`financial_year_id` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `acct_code_idx` ON `shranix_chart_of_accounts` (`account_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `acct_name_idx` ON `shranix_chart_of_accounts` (`account_name`);--> statement-breakpoint
CREATE TABLE `shranix_companies` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`alias` text,
	`address` text,
	`city` text,
	`state` text,
	`pincode` text,
	`country` text DEFAULT 'India' NOT NULL,
	`phone` text,
	`email` text,
	`website` text,
	`gstin` text,
	`pan` text,
	`cin` text,
	`logo` text,
	`is_active` integer DEFAULT true NOT NULL,
	`is_head_office` integer DEFAULT false NOT NULL,
	`financial_year_start` text DEFAULT 'April' NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`timezone` text DEFAULT 'Asia/Kolkata' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companies_name_idx` ON `shranix_companies` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `companies_gstin_idx` ON `shranix_companies` (`gstin`);--> statement-breakpoint
CREATE TABLE `shranix_cost_centers` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`type` text DEFAULT 'department' NOT NULL,
	`parent_id` text,
	`level` integer DEFAULT 0 NOT NULL,
	`path` text,
	`is_active` integer DEFAULT true NOT NULL,
	`description` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cost_center_code_idx` ON `shranix_cost_centers` (`code`);--> statement-breakpoint
CREATE TABLE `shranix_customer_price_list` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`customer_id` text NOT NULL,
	`item_id` text NOT NULL,
	`variant_id` text,
	`rate` real DEFAULT 0 NOT NULL,
	`discount_percent` real DEFAULT 0 NOT NULL,
	`min_quantity` real DEFAULT 1 NOT NULL,
	`effective_from` text,
	`effective_to` text,
	`currency` text DEFAULT 'INR' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_price_idx` ON `shranix_customer_price_list` (`customer_id`,`item_id`);--> statement-breakpoint
CREATE TABLE `shranix_delivery_challans` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`challan_number` text NOT NULL,
	`order_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`warehouse_id` text,
	`dispatch_date` text NOT NULL,
	`dispatch_type` text DEFAULT 'full' NOT NULL,
	`vehicle_no` text,
	`vehicle_type` text,
	`driver_name` text,
	`driver_mobile` text,
	`transporter_name` text,
	`lr_no` text,
	`lr_date` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`financial_year_id` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dc_challan_number_idx` ON `shranix_delivery_challans` (`challan_number`);--> statement-breakpoint
CREATE TABLE `shranix_escalation_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`module` text NOT NULL,
	`document_type` text NOT NULL,
	`trigger_state` text NOT NULL,
	`escalation_type` text DEFAULT 'time' NOT NULL,
	`timeout_hours` real DEFAULT 24 NOT NULL,
	`reminder_interval_hours` real DEFAULT 0,
	`max_reminders` integer DEFAULT 3,
	`escalate_to_role` text,
	`escalate_to_user_id` text,
	`escalate_to_level` integer DEFAULT 1,
	`auto_approve_after_hours` real DEFAULT 0,
	`is_active` integer DEFAULT true NOT NULL,
	`notify_initiator` integer DEFAULT true NOT NULL,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `wf_escalation_module_idx` ON `shranix_escalation_rules` (`module`,`document_type`);--> statement-breakpoint
CREATE TABLE `shranix_finance_analytics` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`analytics_type` text NOT NULL,
	`period_key` text NOT NULL,
	`financial_year_id` text,
	`branch_id` text,
	`total_revenue` real DEFAULT 0 NOT NULL,
	`total_expenses` real DEFAULT 0 NOT NULL,
	`net_profit` real DEFAULT 0 NOT NULL,
	`total_receivables` real DEFAULT 0 NOT NULL,
	`total_payables` real DEFAULT 0 NOT NULL,
	`cash_balance` real DEFAULT 0 NOT NULL,
	`bank_balance` real DEFAULT 0 NOT NULL,
	`total_sales` real DEFAULT 0 NOT NULL,
	`total_purchases` real DEFAULT 0 NOT NULL,
	`total_gst_input` real DEFAULT 0 NOT NULL,
	`total_gst_output` real DEFAULT 0 NOT NULL,
	`total_gst_payable` real DEFAULT 0 NOT NULL,
	`customer_count` integer DEFAULT 0 NOT NULL,
	`vendor_count` integer DEFAULT 0 NOT NULL,
	`invoice_count` integer DEFAULT 0 NOT NULL,
	`metrics` text,
	`computed_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `analytics_period_idx` ON `shranix_finance_analytics` (`analytics_type`,`period_key`);--> statement-breakpoint
CREATE TABLE `shranix_financial_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`snapshot_type` text NOT NULL,
	`snapshot_date` text NOT NULL,
	`financial_year_id` text,
	`branch_id` text,
	`cost_center_id` text,
	`data` text NOT NULL,
	`total_debit` real DEFAULT 0 NOT NULL,
	`total_credit` real DEFAULT 0 NOT NULL,
	`generated_by` text,
	`generated_at` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `snapshot_type_date_idx` ON `shranix_financial_snapshots` (`snapshot_type`,`snapshot_date`);--> statement-breakpoint
CREATE TABLE `shranix_financial_years` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`is_closed` integer DEFAULT false NOT NULL,
	`company_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fy_name_idx` ON `shranix_financial_years` (`name`);--> statement-breakpoint
CREATE TABLE `shranix_fiscal_closing_records` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`financial_year_id` text NOT NULL,
	`closing_date` text NOT NULL,
	`closing_type` text DEFAULT 'yearly' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`total_revenue` real DEFAULT 0 NOT NULL,
	`total_expenses` real DEFAULT 0 NOT NULL,
	`net_profit_loss` real DEFAULT 0 NOT NULL,
	`retained_earnings_account_id` text,
	`closing_entries` text,
	`notes` text,
	`closed_by` text,
	`closed_at` text,
	`approved_by` text,
	`approved_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_closing_fy_idx` ON `shranix_fiscal_closing_records` (`financial_year_id`,`closing_type`);--> statement-breakpoint
CREATE TABLE `shranix_grn_items` (
	`id` text PRIMARY KEY NOT NULL,
	`grn_id` text NOT NULL,
	`po_item_id` text,
	`item_id` text NOT NULL,
	`variant_id` text,
	`ordered_quantity` real DEFAULT 0 NOT NULL,
	`received_quantity` real DEFAULT 0 NOT NULL,
	`accepted_quantity` real DEFAULT 0 NOT NULL,
	`rejected_quantity` real DEFAULT 0 NOT NULL,
	`damaged_quantity` real DEFAULT 0 NOT NULL,
	`short_quantity` real DEFAULT 0 NOT NULL,
	`rate` real DEFAULT 0 NOT NULL,
	`batch_no` text,
	`mfg_date` text,
	`exp_date` text,
	`serial_numbers` text,
	`warehouse_id` text,
	`remarks` text
);
--> statement-breakpoint
CREATE TABLE `shranix_gst_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`rate` integer NOT NULL,
	`type` text DEFAULT 'igst' NOT NULL,
	`igst` integer DEFAULT 0 NOT NULL,
	`cgst` integer DEFAULT 0 NOT NULL,
	`sgst` integer DEFAULT 0 NOT NULL,
	`cess` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`effective_from` text,
	`effective_to` text,
	`hsn_sac_code` text,
	`tax_group_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gst_rates_name_idx` ON `shranix_gst_rates` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `gst_rate_type_idx` ON `shranix_gst_rates` (`rate`,`type`);--> statement-breakpoint
CREATE TABLE `shranix_gl_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`entry_number` text NOT NULL,
	`entry_date` text NOT NULL,
	`account_id` text NOT NULL,
	`ledger_id` text,
	`voucher_id` text NOT NULL,
	`voucher_type` text NOT NULL,
	`voucher_number` text NOT NULL,
	`debit` real DEFAULT 0 NOT NULL,
	`credit` real DEFAULT 0 NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	`narration` text,
	`party_id` text,
	`cost_center_id` text,
	`branch_id` text,
	`financial_year_id` text,
	`is_reversal` integer DEFAULT false NOT NULL,
	`reversed_entry_id` text,
	`reversal_date` text,
	`currency` text DEFAULT 'INR' NOT NULL,
	`exchange_rate` real DEFAULT 1 NOT NULL,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gl_entry_number_idx` ON `shranix_gl_entries` (`entry_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `gl_account_date_idx` ON `shranix_gl_entries` (`account_id`,`entry_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `gl_voucher_idx` ON `shranix_gl_entries` (`voucher_id`);--> statement-breakpoint
CREATE TABLE `shranix_grn` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`grn_number` text NOT NULL,
	`po_id` text NOT NULL,
	`supplier_id` text NOT NULL,
	`warehouse_id` text,
	`received_date` text NOT NULL,
	`receipt_type` text DEFAULT 'full' NOT NULL,
	`delivery_challan_no` text,
	`transporter_name` text,
	`vehicle_no` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`financial_year_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grn_number_idx` ON `shranix_grn` (`grn_number`);--> statement-breakpoint
CREATE TABLE `shranix_gst_audit_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`setting_key` text NOT NULL,
	`setting_value` text NOT NULL,
	`setting_group` text NOT NULL,
	`description` text,
	`is_system` text DEFAULT 'no' NOT NULL,
	`data_type` text DEFAULT 'text' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `setting_key_idx` ON `shranix_gst_audit_settings` (`setting_key`);--> statement-breakpoint
CREATE TABLE `shranix_gst_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`voucher_type` text NOT NULL,
	`voucher_id` text NOT NULL,
	`voucher_number` text NOT NULL,
	`voucher_date` text NOT NULL,
	`gstin` text,
	`gst_type` text NOT NULL,
	`gst_rate` real DEFAULT 0 NOT NULL,
	`taxable_value` real DEFAULT 0 NOT NULL,
	`gst_amount` real DEFAULT 0 NOT NULL,
	`cess_amount` real DEFAULT 0 NOT NULL,
	`input_output` text NOT NULL,
	`reverse_charge` text DEFAULT 'no' NOT NULL,
	`hsn_sac_code` text,
	`financial_year_id` text,
	`branch_id` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gst_voucher_idx` ON `shranix_gst_ledger` (`voucher_type`,`voucher_id`);--> statement-breakpoint
CREATE TABLE `shranix_gst_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`gstin` text NOT NULL,
	`trade_name` text NOT NULL,
	`legal_name` text NOT NULL,
	`address` text,
	`state_code` text,
	`registration_type` text DEFAULT 'regular' NOT NULL,
	`tax_payer_type` text DEFAULT 'regular' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`valid_from` text,
	`valid_to` text,
	`cancel_date` text,
	`eway_bill_required` text DEFAULT 'no' NOT NULL,
	`einvoice_required` text DEFAULT 'no' NOT NULL,
	`return_filing_type` text DEFAULT 'monthly' NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shranix_gst_registrations_gstin_unique` ON `shranix_gst_registrations` (`gstin`);--> statement-breakpoint
CREATE UNIQUE INDEX `gst_gstin_idx` ON `shranix_gst_registrations` (`gstin`);--> statement-breakpoint
CREATE TABLE `shranix_gst_returns` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`return_type` text NOT NULL,
	`return_period` text NOT NULL,
	`financial_year` text NOT NULL,
	`gstin` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`total_outward_supply` real DEFAULT 0 NOT NULL,
	`total_inward_supply` real DEFAULT 0 NOT NULL,
	`total_output_tax` real DEFAULT 0 NOT NULL,
	`total_input_tax_credit` real DEFAULT 0 NOT NULL,
	`net_tax_payable` real DEFAULT 0 NOT NULL,
	`total_paid` real DEFAULT 0 NOT NULL,
	`balance_due` real DEFAULT 0 NOT NULL,
	`filing_date` text,
	`acknowledgment_no` text,
	`prepared_by` text,
	`validated_by` text,
	`remarks` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gst_return_period_idx` ON `shranix_gst_returns` (`return_type`,`return_period`);--> statement-breakpoint
CREATE TABLE `shranix_hsn_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'hsn' NOT NULL,
	`gst_rate` real DEFAULT 0 NOT NULL,
	`igst` real DEFAULT 0 NOT NULL,
	`cgst` real DEFAULT 0 NOT NULL,
	`sgst` real DEFAULT 0 NOT NULL,
	`cess` real DEFAULT 0 NOT NULL,
	`chapter` text,
	`heading` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hsn_code_idx` ON `shranix_hsn_codes` (`code`);--> statement-breakpoint
CREATE TABLE `shranix_inventory_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`company_id` text,
	`method` text DEFAULT 'fifo' NOT NULL,
	`negative_stock` integer DEFAULT false NOT NULL,
	`auto_reorder` integer DEFAULT false NOT NULL,
	`batch_tracking` integer DEFAULT false NOT NULL,
	`serial_tracking` integer DEFAULT false NOT NULL,
	`expiry_tracking` integer DEFAULT false NOT NULL,
	`default_warehouse_id` text,
	`stock_valuation` text DEFAULT 'cost' NOT NULL,
	`round_off` integer DEFAULT 2 NOT NULL,
	`enable_warehouse` integer DEFAULT true NOT NULL,
	`enable_batch` integer DEFAULT false NOT NULL,
	`enable_serial` integer DEFAULT false NOT NULL,
	`enable_expiry` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inv_settings_company_idx` ON `shranix_inventory_settings` (`company_id`);--> statement-breakpoint
CREATE TABLE `shranix_invoice_items` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`order_item_id` text,
	`challan_item_id` text,
	`item_id` text NOT NULL,
	`variant_id` text,
	`description` text,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit_id` text,
	`rate` real DEFAULT 0 NOT NULL,
	`discount_percent` real DEFAULT 0 NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`taxable_value` real DEFAULT 0 NOT NULL,
	`gst_rate` real DEFAULT 0 NOT NULL,
	`igst` real DEFAULT 0 NOT NULL,
	`cgst` real DEFAULT 0 NOT NULL,
	`sgst` real DEFAULT 0 NOT NULL,
	`cess` real DEFAULT 0 NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_item_barcodes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`item_id` text NOT NULL,
	`variant_id` text,
	`barcode` text NOT NULL,
	`type` text DEFAULT 'ean13' NOT NULL,
	`is_default` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `item_barcode_idx` ON `shranix_item_barcodes` (`barcode`);--> statement-breakpoint
CREATE TABLE `shranix_item_group_items` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`group_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `item_group_items_idx` ON `shranix_item_group_items` (`item_id`,`group_id`);--> statement-breakpoint
CREATE TABLE `shranix_item_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `item_groups_name_idx` ON `shranix_item_groups` (`name`);--> statement-breakpoint
CREATE TABLE `shranix_item_images` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`item_id` text NOT NULL,
	`variant_id` text,
	`url` text NOT NULL,
	`thumbnail_url` text,
	`alt` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_item_pricing` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`item_id` text NOT NULL,
	`variant_id` text,
	`price_list` text DEFAULT 'standard' NOT NULL,
	`purchase_rate` real DEFAULT 0 NOT NULL,
	`sales_rate` real DEFAULT 0 NOT NULL,
	`mrp` real DEFAULT 0 NOT NULL,
	`discount_percent` real DEFAULT 0 NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`effective_from` text,
	`effective_to` text,
	`min_quantity` real DEFAULT 1 NOT NULL,
	`party_id` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `item_pricing_idx` ON `shranix_item_pricing` (`item_id`,`price_list`,`party_id`);--> statement-breakpoint
CREATE TABLE `shranix_item_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`item_id` text NOT NULL,
	`name` text NOT NULL,
	`sku` text NOT NULL,
	`barcode` text,
	`purchase_rate` real DEFAULT 0 NOT NULL,
	`sales_rate` real DEFAULT 0 NOT NULL,
	`mrp` real DEFAULT 0 NOT NULL,
	`stock` real DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`attributes` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `variant_sku_idx` ON `shranix_item_variants` (`sku`);--> statement-breakpoint
CREATE TABLE `shranix_items` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`sku` text NOT NULL,
	`type` text DEFAULT 'product' NOT NULL,
	`description` text,
	`category_id` text,
	`brand_id` text,
	`unit_id` text,
	`gst_rate_id` text,
	`hsn_code` text,
	`purchase_rate` real DEFAULT 0 NOT NULL,
	`sales_rate` real DEFAULT 0 NOT NULL,
	`mrp` real DEFAULT 0 NOT NULL,
	`min_stock` real DEFAULT 0 NOT NULL,
	`max_stock` real DEFAULT 0 NOT NULL,
	`reorder_level` real DEFAULT 0 NOT NULL,
	`opening_stock` real DEFAULT 0 NOT NULL,
	`current_stock` real DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`has_batch` integer DEFAULT false NOT NULL,
	`has_serial` integer DEFAULT false NOT NULL,
	`has_expiry` integer DEFAULT false NOT NULL,
	`is_taxable` integer DEFAULT true NOT NULL,
	`tax_preference` text DEFAULT 'taxable' NOT NULL,
	`weight` real,
	`weight_unit` text,
	`notes` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `items_sku_idx` ON `shranix_items` (`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `items_name_idx` ON `shranix_items` (`name`);--> statement-breakpoint
CREATE TABLE `shranix_journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`voucher_number` text NOT NULL,
	`voucher_date` text NOT NULL,
	`voucher_type` text DEFAULT 'journal' NOT NULL,
	`narration` text,
	`total_debit` real DEFAULT 0 NOT NULL,
	`total_credit` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`reference_number` text,
	`reference_date` text,
	`attachments` text,
	`is_posted` integer DEFAULT false NOT NULL,
	`posted_at` text,
	`posted_by` text,
	`approved_by` text,
	`approved_at` text,
	`financial_year_id` text,
	`cost_center_id` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_voucher_number_idx` ON `shranix_journal_entries` (`voucher_number`);--> statement-breakpoint
CREATE TABLE `shranix_journal_entry_items` (
	`id` text PRIMARY KEY NOT NULL,
	`journal_entry_id` text NOT NULL,
	`account_id` text NOT NULL,
	`ledger_id` text,
	`debit` real DEFAULT 0 NOT NULL,
	`credit` real DEFAULT 0 NOT NULL,
	`narration` text,
	`cost_center_id` text,
	`party_id` text,
	`reference_no` text
);
--> statement-breakpoint
CREATE TABLE `shranix_ledger_master` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`account_id` text NOT NULL,
	`ledger_type` text NOT NULL,
	`party_id` text,
	`opening_balance` real DEFAULT 0 NOT NULL,
	`opening_balance_type` text DEFAULT 'debit' NOT NULL,
	`current_balance` real DEFAULT 0 NOT NULL,
	`credit_limit` real DEFAULT 0 NOT NULL,
	`credit_days` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_account_idx` ON `shranix_ledger_master` (`account_id`);--> statement-breakpoint
CREATE TABLE `shranix_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` text DEFAULT 'info' NOT NULL,
	`module` text,
	`document_id` text,
	`document_type` text,
	`instance_id` text,
	`task_id` text,
	`is_read` integer DEFAULT false NOT NULL,
	`read_at` text,
	`is_email_sent` integer DEFAULT false NOT NULL,
	`is_sms_sent` integer DEFAULT false NOT NULL,
	`is_push_sent` integer DEFAULT false NOT NULL,
	`email_ready` text,
	`sms_ready` text,
	`push_ready` text,
	`metadata` text
);
--> statement-breakpoint
CREATE INDEX `wf_notif_user_idx` ON `shranix_notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `wf_notif_read_idx` ON `shranix_notifications` (`is_read`);--> statement-breakpoint
CREATE INDEX `wf_notif_user_read_idx` ON `shranix_notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE TABLE `shranix_number_series` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`series_name` text NOT NULL,
	`series_code` text NOT NULL,
	`module` text NOT NULL,
	`document_type` text NOT NULL,
	`prefix` text DEFAULT '' NOT NULL,
	`suffix` text DEFAULT '' NOT NULL,
	`start_number` integer DEFAULT 1 NOT NULL,
	`current_number` integer DEFAULT 0 NOT NULL,
	`end_number` integer,
	`pad_length` integer DEFAULT 5 NOT NULL,
	`reset_frequency` text,
	`is_active` text DEFAULT 'yes' NOT NULL,
	`allow_override` text DEFAULT 'no' NOT NULL,
	`branch_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `series_name_idx` ON `shranix_number_series` (`series_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `series_code_idx` ON `shranix_number_series` (`series_code`);--> statement-breakpoint
CREATE TABLE `shranix_opening_balance_transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`transfer_number` text NOT NULL,
	`from_financial_year_id` text NOT NULL,
	`to_financial_year_id` text NOT NULL,
	`transfer_date` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`total_debit` real DEFAULT 0 NOT NULL,
	`total_credit` real DEFAULT 0 NOT NULL,
	`account_count` integer DEFAULT 0 NOT NULL,
	`transfer_type` text DEFAULT 'all' NOT NULL,
	`remarks` text,
	`approved_by` text,
	`approved_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shranix_opening_balance_transfers_transfer_number_unique` ON `shranix_opening_balance_transfers` (`transfer_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `transfer_number_idx` ON `shranix_opening_balance_transfers` (`transfer_number`);--> statement-breakpoint
CREATE TABLE `shranix_po_items` (
	`id` text PRIMARY KEY NOT NULL,
	`po_id` text NOT NULL,
	`item_id` text NOT NULL,
	`variant_id` text,
	`description` text,
	`quantity` real DEFAULT 1 NOT NULL,
	`received_quantity` real DEFAULT 0 NOT NULL,
	`damaged_quantity` real DEFAULT 0 NOT NULL,
	`unit_id` text,
	`rate` real DEFAULT 0 NOT NULL,
	`discount_percent` real DEFAULT 0 NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`taxable_value` real DEFAULT 0 NOT NULL,
	`gst_rate` real DEFAULT 0 NOT NULL,
	`igst` real DEFAULT 0 NOT NULL,
	`cgst` real DEFAULT 0 NOT NULL,
	`sgst` real DEFAULT 0 NOT NULL,
	`cess` real DEFAULT 0 NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_period_locks` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`financial_year_id` text NOT NULL,
	`period_type` text NOT NULL,
	`period_key` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`is_locked` text DEFAULT 'yes' NOT NULL,
	`locked_by` text,
	`locked_at` text,
	`unlocked_by` text,
	`unlocked_at` text,
	`unlock_reason` text,
	`role_required` text DEFAULT 'admin' NOT NULL,
	`module` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `period_lock_key_idx` ON `shranix_period_locks` (`financial_year_id`,`period_type`,`period_key`);--> statement-breakpoint
CREATE TABLE `shranix_posting_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`rule_name` text NOT NULL,
	`voucher_type` text NOT NULL,
	`debit_account_id` text,
	`credit_account_id` text,
	`condition` text,
	`is_active` integer DEFAULT true NOT NULL,
	`description` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posting_rule_name_idx` ON `shranix_posting_rules` (`rule_name`);--> statement-breakpoint
CREATE TABLE `shranix_purchase_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`document_type` text NOT NULL,
	`document_id` text NOT NULL,
	`requested_by` text NOT NULL,
	`approved_by` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`approval_date` text,
	`comments` text,
	`approval_level` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_purchase_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`invoice_number` text NOT NULL,
	`supplier_invoice_no` text,
	`supplier_id` text NOT NULL,
	`po_id` text,
	`grn_id` text,
	`invoice_date` text NOT NULL,
	`due_date` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`sub_total` real DEFAULT 0 NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`tax_amount` real DEFAULT 0 NOT NULL,
	`round_off` real DEFAULT 0 NOT NULL,
	`grand_total` real DEFAULT 0 NOT NULL,
	`paid_amount` real DEFAULT 0 NOT NULL,
	`balance_amount` real DEFAULT 0 NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`notes` text,
	`financial_year_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pi_number_idx` ON `shranix_purchase_invoices` (`invoice_number`);--> statement-breakpoint
CREATE TABLE `shranix_purchase_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`po_number` text NOT NULL,
	`supplier_id` text NOT NULL,
	`branch_id` text,
	`warehouse_id` text,
	`order_date` text NOT NULL,
	`expected_delivery` text,
	`currency` text DEFAULT 'INR' NOT NULL,
	`payment_terms` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`sub_total` real DEFAULT 0 NOT NULL,
	`discount_percent` real DEFAULT 0 NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`tax_amount` real DEFAULT 0 NOT NULL,
	`round_off` real DEFAULT 0 NOT NULL,
	`grand_total` real DEFAULT 0 NOT NULL,
	`notes` text,
	`terms` text,
	`approved_by` text,
	`approved_at` text,
	`rejection_reason` text,
	`financial_year_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `po_number_idx` ON `shranix_purchase_orders` (`po_number`);--> statement-breakpoint
CREATE TABLE `shranix_purchase_quotations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`quote_number` text NOT NULL,
	`supplier_id` text NOT NULL,
	`quote_date` text NOT NULL,
	`valid_until` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`sub_total` real DEFAULT 0 NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`tax_amount` real DEFAULT 0 NOT NULL,
	`grand_total` real DEFAULT 0 NOT NULL,
	`notes` text,
	`converted_to_po` integer DEFAULT false NOT NULL,
	`po_id` text,
	`financial_year_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quote_number_idx` ON `shranix_purchase_quotations` (`quote_number`);--> statement-breakpoint
CREATE TABLE `shranix_purchase_returns` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`return_number` text NOT NULL,
	`supplier_id` text NOT NULL,
	`invoice_id` text,
	`grn_id` text,
	`return_date` text NOT NULL,
	`return_reason` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`sub_total` real DEFAULT 0 NOT NULL,
	`tax_amount` real DEFAULT 0 NOT NULL,
	`grand_total` real DEFAULT 0 NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`notes` text,
	`financial_year_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pr_number_idx` ON `shranix_purchase_returns` (`return_number`);--> statement-breakpoint
CREATE TABLE `shranix_purchase_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`company_id` text,
	`auto_po_number` integer DEFAULT true NOT NULL,
	`po_prefix` text DEFAULT 'PO-' NOT NULL,
	`po_next_number` integer DEFAULT 1 NOT NULL,
	`quotation_prefix` text DEFAULT 'QTN-' NOT NULL,
	`quotation_next_number` integer DEFAULT 1 NOT NULL,
	`grn_prefix` text DEFAULT 'GRN-' NOT NULL,
	`grn_next_number` integer DEFAULT 1 NOT NULL,
	`invoice_prefix` text DEFAULT 'PI-' NOT NULL,
	`invoice_next_number` integer DEFAULT 1 NOT NULL,
	`return_prefix` text DEFAULT 'PR-' NOT NULL,
	`return_next_number` integer DEFAULT 1 NOT NULL,
	`require_approval` integer DEFAULT false NOT NULL,
	`approval_levels` integer DEFAULT 1 NOT NULL,
	`default_payment_terms` text DEFAULT '30 days' NOT NULL,
	`gst_enabled` integer DEFAULT true NOT NULL,
	`round_off_decimals` integer DEFAULT 2 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_settings_company_idx` ON `shranix_purchase_settings` (`company_id`);--> statement-breakpoint
CREATE TABLE `shranix_quotation_items` (
	`id` text PRIMARY KEY NOT NULL,
	`quotation_id` text NOT NULL,
	`item_id` text NOT NULL,
	`variant_id` text,
	`description` text,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit_id` text,
	`rate` real DEFAULT 0 NOT NULL,
	`discount_percent` real DEFAULT 0 NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`taxable_value` real DEFAULT 0 NOT NULL,
	`gst_rate` real DEFAULT 0 NOT NULL,
	`igst` real DEFAULT 0 NOT NULL,
	`cgst` real DEFAULT 0 NOT NULL,
	`sgst` real DEFAULT 0 NOT NULL,
	`cess` real DEFAULT 0 NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_report_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`report_type` text NOT NULL,
	`report_key` text NOT NULL,
	`params` text NOT NULL,
	`data` text NOT NULL,
	`generated_at` text NOT NULL,
	`expires_at` text,
	`generated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `report_cache_key_idx` ON `shranix_report_cache` (`report_type`,`report_key`);--> statement-breakpoint
CREATE TABLE `shranix_return_items` (
	`id` text PRIMARY KEY NOT NULL,
	`return_id` text NOT NULL,
	`invoice_item_id` text,
	`item_id` text NOT NULL,
	`variant_id` text,
	`quantity` real DEFAULT 0 NOT NULL,
	`rate` real DEFAULT 0 NOT NULL,
	`taxable_value` real DEFAULT 0 NOT NULL,
	`gst_rate` real DEFAULT 0 NOT NULL,
	`igst` real DEFAULT 0 NOT NULL,
	`cgst` real DEFAULT 0 NOT NULL,
	`sgst` real DEFAULT 0 NOT NULL,
	`cess` real DEFAULT 0 NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL,
	`reason` text
);
--> statement-breakpoint
CREATE TABLE `shranix_sales_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`document_type` text NOT NULL,
	`document_id` text NOT NULL,
	`requested_by` text NOT NULL,
	`approved_by` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`approval_date` text,
	`comments` text,
	`approval_level` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_sales_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`invoice_number` text NOT NULL,
	`order_id` text,
	`challan_id` text,
	`customer_id` text NOT NULL,
	`customer_invoice_no` text,
	`invoice_date` text NOT NULL,
	`due_date` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`sub_total` real DEFAULT 0 NOT NULL,
	`discount_percent` real DEFAULT 0 NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`tax_amount` real DEFAULT 0 NOT NULL,
	`round_off` real DEFAULT 0 NOT NULL,
	`grand_total` real DEFAULT 0 NOT NULL,
	`paid_amount` real DEFAULT 0 NOT NULL,
	`balance_amount` real DEFAULT 0 NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`notes` text,
	`financial_year_id` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `si_number_idx` ON `shranix_sales_invoices` (`invoice_number`);--> statement-breakpoint
CREATE TABLE `shranix_sales_order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`item_id` text NOT NULL,
	`variant_id` text,
	`description` text,
	`quantity` real DEFAULT 1 NOT NULL,
	`delivered_quantity` real DEFAULT 0 NOT NULL,
	`reserved_quantity` real DEFAULT 0 NOT NULL,
	`unit_id` text,
	`rate` real DEFAULT 0 NOT NULL,
	`discount_percent` real DEFAULT 0 NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`taxable_value` real DEFAULT 0 NOT NULL,
	`gst_rate` real DEFAULT 0 NOT NULL,
	`igst` real DEFAULT 0 NOT NULL,
	`cgst` real DEFAULT 0 NOT NULL,
	`sgst` real DEFAULT 0 NOT NULL,
	`cess` real DEFAULT 0 NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_sales_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`order_number` text NOT NULL,
	`customer_id` text NOT NULL,
	`quotation_id` text,
	`order_date` text NOT NULL,
	`delivery_date` text,
	`warehouse_id` text,
	`branch_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`sub_total` real DEFAULT 0 NOT NULL,
	`discount_percent` real DEFAULT 0 NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`tax_amount` real DEFAULT 0 NOT NULL,
	`round_off` real DEFAULT 0 NOT NULL,
	`grand_total` real DEFAULT 0 NOT NULL,
	`notes` text,
	`terms` text,
	`approved_by` text,
	`approved_at` text,
	`rejection_reason` text,
	`financial_year_id` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `so_order_number_idx` ON `shranix_sales_orders` (`order_number`);--> statement-breakpoint
CREATE TABLE `shranix_sales_quotations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`quote_number` text NOT NULL,
	`customer_id` text NOT NULL,
	`quote_date` text NOT NULL,
	`valid_till` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`sub_total` real DEFAULT 0 NOT NULL,
	`discount_percent` real DEFAULT 0 NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`tax_amount` real DEFAULT 0 NOT NULL,
	`round_off` real DEFAULT 0 NOT NULL,
	`grand_total` real DEFAULT 0 NOT NULL,
	`notes` text,
	`terms` text,
	`approved_by` text,
	`approved_at` text,
	`converted_to_order` integer DEFAULT false NOT NULL,
	`order_id` text,
	`financial_year_id` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sq_quote_number_idx` ON `shranix_sales_quotations` (`quote_number`);--> statement-breakpoint
CREATE TABLE `shranix_sales_returns` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`return_number` text NOT NULL,
	`invoice_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`return_date` text NOT NULL,
	`return_reason` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`sub_total` real DEFAULT 0 NOT NULL,
	`tax_amount` real DEFAULT 0 NOT NULL,
	`grand_total` real DEFAULT 0 NOT NULL,
	`credit_note_no` text,
	`credit_note_date` text,
	`approved_by` text,
	`approved_at` text,
	`notes` text,
	`financial_year_id` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sr_number_idx` ON `shranix_sales_returns` (`return_number`);--> statement-breakpoint
CREATE TABLE `shranix_sales_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`company_id` text,
	`auto_quote_number` integer DEFAULT true NOT NULL,
	`quote_prefix` text DEFAULT 'SQ-' NOT NULL,
	`quote_next_number` integer DEFAULT 1 NOT NULL,
	`auto_order_number` integer DEFAULT true NOT NULL,
	`order_prefix` text DEFAULT 'SO-' NOT NULL,
	`order_next_number` integer DEFAULT 1 NOT NULL,
	`challan_prefix` text DEFAULT 'DC-' NOT NULL,
	`challan_next_number` integer DEFAULT 1 NOT NULL,
	`auto_invoice_number` integer DEFAULT true NOT NULL,
	`invoice_prefix` text DEFAULT 'SI-' NOT NULL,
	`invoice_next_number` integer DEFAULT 1 NOT NULL,
	`return_prefix` text DEFAULT 'SR-' NOT NULL,
	`return_next_number` integer DEFAULT 1 NOT NULL,
	`require_approval` integer DEFAULT false NOT NULL,
	`approval_levels` integer DEFAULT 1 NOT NULL,
	`gst_enabled` integer DEFAULT true NOT NULL,
	`round_off_decimals` integer DEFAULT 2 NOT NULL,
	`default_payment_terms` text DEFAULT '30 days' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_settings_company_idx` ON `shranix_sales_settings` (`company_id`);--> statement-breakpoint
CREATE TABLE `shranix_stock_opening` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`item_id` text NOT NULL,
	`variant_id` text,
	`warehouse_id` text,
	`batch_no` text,
	`quantity` real DEFAULT 0 NOT NULL,
	`rate` real DEFAULT 0 NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`mfg_date` text,
	`exp_date` text,
	`serial_numbers` text,
	`financial_year_id` text,
	`is_posted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_opening_idx` ON `shranix_stock_opening` (`item_id`,`warehouse_id`,`batch_no`);--> statement-breakpoint
CREATE TABLE `shranix_supplier_price_list` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`supplier_id` text NOT NULL,
	`item_id` text NOT NULL,
	`variant_id` text,
	`rate` real DEFAULT 0 NOT NULL,
	`discount_percent` real DEFAULT 0 NOT NULL,
	`effective_from` text,
	`effective_to` text,
	`min_quantity` real DEFAULT 1 NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supplier_price_idx` ON `shranix_supplier_price_list` (`supplier_id`,`item_id`);--> statement-breakpoint
CREATE TABLE `shranix_tax_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'gst' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_default` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tax_groups_name_idx` ON `shranix_tax_groups` (`name`);--> statement-breakpoint
CREATE TABLE `shranix_tax_postings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`posting_type` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`source_number` text,
	`source_date` text,
	`posting_rule` text,
	`from_account_id` text,
	`to_account_id` text,
	`amount` real DEFAULT 0 NOT NULL,
	`tax_amount` real DEFAULT 0 NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`posted_date` text,
	`error_log` text,
	`financial_year_id` text,
	`branch_id` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE TABLE `shranix_units` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`type` text DEFAULT 'general' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `units_name_idx` ON `shranix_units` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `units_short_name_idx` ON `shranix_units` (`short_name`);--> statement-breakpoint
CREATE TABLE `shranix_voucher_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`approval_number` text NOT NULL,
	`voucher_type` text NOT NULL,
	`voucher_id` text NOT NULL,
	`voucher_number` text NOT NULL,
	`module` text NOT NULL,
	`approval_level` integer DEFAULT 1 NOT NULL,
	`max_level` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_by` text,
	`approved_by` text,
	`approved_at` text,
	`rejected_by` text,
	`rejected_at` text,
	`rejection_reason` text,
	`escalated_to` text,
	`remarks` text,
	`amount` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `approval_number_idx` ON `shranix_voucher_approvals` (`approval_number`);--> statement-breakpoint
CREATE TABLE `shranix_warehouses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`address` text,
	`city` text,
	`state` text,
	`phone` text,
	`is_active` integer DEFAULT true NOT NULL,
	`is_main` integer DEFAULT false NOT NULL,
	`branch_id` text,
	`company_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warehouse_code_idx` ON `shranix_warehouses` (`code`);--> statement-breakpoint
CREATE TABLE `shranix_workflow_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`instance_id` text NOT NULL,
	`document_id` text,
	`document_type` text,
	`user_id` text NOT NULL,
	`user_name` text,
	`comment_type` text DEFAULT 'comment' NOT NULL,
	`message` text NOT NULL,
	`mentions` text,
	`attachment_url` text,
	`attachment_name` text,
	`is_internal` integer DEFAULT false NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE INDEX `wf_comment_instance_idx` ON `shranix_workflow_comments` (`instance_id`);--> statement-breakpoint
CREATE INDEX `wf_comment_user_idx` ON `shranix_workflow_comments` (`user_id`);--> statement-breakpoint
CREATE TABLE `shranix_workflow_history` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`instance_id` text NOT NULL,
	`document_id` text,
	`document_type` text,
	`action` text NOT NULL,
	`action_label` text,
	`from_state` text,
	`to_state` text,
	`user_id` text NOT NULL,
	`user_name` text,
	`user_role` text,
	`comment` text,
	`approval_level` integer,
	`ip_address` text,
	`user_agent` text,
	`metadata` text,
	`audit_log_id` text
);
--> statement-breakpoint
CREATE INDEX `wf_history_instance_idx` ON `shranix_workflow_history` (`instance_id`);--> statement-breakpoint
CREATE INDEX `wf_history_user_idx` ON `shranix_workflow_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `wf_history_action_idx` ON `shranix_workflow_history` (`action`);--> statement-breakpoint
CREATE INDEX `wf_history_timestamp_idx` ON `shranix_workflow_history` (`created_at`);--> statement-breakpoint
CREATE TABLE `shranix_workflow_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`template_id` text NOT NULL,
	`document_id` text NOT NULL,
	`document_type` text NOT NULL,
	`document_number` text,
	`module` text NOT NULL,
	`current_state` text DEFAULT 'draft' NOT NULL,
	`previous_state` text,
	`status` text DEFAULT 'active' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`initiator_id` text,
	`assigned_to_id` text,
	`assigned_role` text,
	`approval_level` integer DEFAULT 0 NOT NULL,
	`max_approval_level` integer DEFAULT 1 NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`department_id` text,
	`branch_id` text,
	`due_date` text,
	`completed_at` text,
	`completed_by` text,
	`variables` text,
	`metadata` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wf_instance_doc_idx` ON `shranix_workflow_instances` (`document_type`,`document_id`);--> statement-breakpoint
CREATE INDEX `wf_instance_state_idx` ON `shranix_workflow_instances` (`current_state`);--> statement-breakpoint
CREATE INDEX `wf_instance_assignee_idx` ON `shranix_workflow_instances` (`assigned_to_id`);--> statement-breakpoint
CREATE INDEX `wf_instance_doc_type_idx` ON `shranix_workflow_instances` (`document_type`);--> statement-breakpoint
CREATE TABLE `shranix_workflow_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`instance_id` text NOT NULL,
	`document_id` text,
	`document_type` text,
	`document_number` text,
	`module` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`task_type` text DEFAULT 'approval' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`assigned_to_id` text,
	`assigned_role` text,
	`assigned_by_name` text,
	`initiated_by_id` text,
	`initiated_by_name` text,
	`approval_level` integer DEFAULT 1 NOT NULL,
	`due_date` text,
	`completed_at` text,
	`completed_by` text,
	`delegated_from_id` text,
	`delegated_to_id` text,
	`is_overdue` integer DEFAULT false NOT NULL,
	`metadata` text,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `wf_task_assignee_idx` ON `shranix_workflow_tasks` (`assigned_to_id`);--> statement-breakpoint
CREATE INDEX `wf_task_status_idx` ON `shranix_workflow_tasks` (`status`);--> statement-breakpoint
CREATE INDEX `wf_task_instance_idx` ON `shranix_workflow_tasks` (`instance_id`);--> statement-breakpoint
CREATE INDEX `wf_task_due_date_idx` ON `shranix_workflow_tasks` (`due_date`);--> statement-breakpoint
CREATE TABLE `shranix_workflow_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`module` text NOT NULL,
	`document_type` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`initial_state` text DEFAULT 'draft' NOT NULL,
	`states` text NOT NULL,
	`transitions` text NOT NULL,
	`config` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wf_template_code_idx` ON `shranix_workflow_templates` (`code`);--> statement-breakpoint
CREATE INDEX `wf_template_module_doc_idx` ON `shranix_workflow_templates` (`module`,`document_type`);--> statement-breakpoint
CREATE TABLE `shranix_year_closing_records` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`closing_number` text NOT NULL,
	`financial_year_id` text NOT NULL,
	`closing_type` text NOT NULL,
	`closing_date` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`total_revenue` real DEFAULT 0 NOT NULL,
	`total_expenses` real DEFAULT 0 NOT NULL,
	`net_profit` real DEFAULT 0 NOT NULL,
	`net_loss` real DEFAULT 0 NOT NULL,
	`retained_earnings` real DEFAULT 0 NOT NULL,
	`total_assets` real DEFAULT 0 NOT NULL,
	`total_liabilities` real DEFAULT 0 NOT NULL,
	`closing_remarks` text,
	`approved_by` text,
	`approved_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shranix_year_closing_records_closing_number_unique` ON `shranix_year_closing_records` (`closing_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `closing_number_idx` ON `shranix_year_closing_records` (`closing_number`);--> statement-breakpoint
CREATE TABLE `shranix_year_end_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`closing_record_id` text NOT NULL,
	`entry_number` text NOT NULL,
	`entry_type` text NOT NULL,
	`from_account_id` text,
	`to_account_id` text,
	`amount` real DEFAULT 0 NOT NULL,
	`debit_amount` real DEFAULT 0 NOT NULL,
	`credit_amount` real DEFAULT 0 NOT NULL,
	`narration` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`posted_date` text,
	`gl_entry_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shranix_year_end_entries_entry_number_unique` ON `shranix_year_end_entries` (`entry_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `year_end_entry_number_idx` ON `shranix_year_end_entries` (`entry_number`);