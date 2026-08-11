CREATE TABLE `shranix_attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`employee_id` text NOT NULL,
	`attendance_date` text NOT NULL,
	`check_in` text,
	`check_out` text,
	`working_hours` real,
	`overtime_hours` real,
	`status` text DEFAULT 'present' NOT NULL,
	`remarks` text,
	`marked_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hr_att_emp_date_idx` ON `shranix_attendance` (`employee_id`,`attendance_date`);--> statement-breakpoint
CREATE INDEX `hr_att_date_idx` ON `shranix_attendance` (`attendance_date`);--> statement-breakpoint
CREATE TABLE `shranix_departments` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`department_code` text NOT NULL,
	`department_name` text NOT NULL,
	`manager_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`description` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hr_dept_code_idx` ON `shranix_departments` (`department_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `hr_dept_name_idx` ON `shranix_departments` (`department_name`);--> statement-breakpoint
CREATE TABLE `shranix_designations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`designation_code` text NOT NULL,
	`designation_name` text NOT NULL,
	`department_id` text,
	`level` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`description` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hr_desig_code_idx` ON `shranix_designations` (`designation_code`);--> statement-breakpoint
CREATE TABLE `shranix_employee_advances` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`advance_number` text NOT NULL,
	`employee_id` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`reason` text,
	`advance_date` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_by` text,
	`approval_date` text,
	`recovery_schedule` text,
	`recovered_amount` real DEFAULT 0 NOT NULL,
	`outstanding_amount` real DEFAULT 0 NOT NULL,
	`gl_entry_id` text,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `hr_adv_emp_idx` ON `shranix_employee_advances` (`employee_id`);--> statement-breakpoint
CREATE TABLE `shranix_employee_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`expense_number` text NOT NULL,
	`employee_id` text NOT NULL,
	`expense_date` text,
	`category` text DEFAULT 'travel' NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`description` text,
	`attachment_ref` text,
	`payment_mode` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`approved_by` text,
	`approval_date` text,
	`gl_entry_id` text,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `hr_exp_emp_idx` ON `shranix_employee_expenses` (`employee_id`);--> statement-breakpoint
CREATE INDEX `hr_exp_status_idx` ON `shranix_employee_expenses` (`status`);--> statement-breakpoint
CREATE TABLE `shranix_employee_timeline` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`employee_id` text NOT NULL,
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`event_date` text,
	`reference_type` text,
	`reference_id` text,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `hr_tl_emp_idx` ON `shranix_employee_timeline` (`employee_id`);--> statement-breakpoint
CREATE TABLE `shranix_employees` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`employee_code` text NOT NULL,
	`first_name` text NOT NULL,
	`middle_name` text,
	`last_name` text,
	`gender` text,
	`date_of_birth` text,
	`mobile` text,
	`alt_mobile` text,
	`email` text,
	`emergency_contact` text,
	`permanent_address` text,
	`current_address` text,
	`village` text,
	`taluka` text,
	`district` text,
	`state` text,
	`pincode` text,
	`department_id` text,
	`designation_id` text,
	`reporting_manager_id` text,
	`joining_date` text,
	`confirmation_date` text,
	`employment_type` text DEFAULT 'full_time' NOT NULL,
	`work_location` text,
	`branch_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`pan` text,
	`aadhaar` text,
	`bank_account` text,
	`ifsc` text,
	`upi` text,
	`user_id` text,
	`shift_id` text,
	`notes` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hr_emp_code_idx` ON `shranix_employees` (`employee_code`);--> statement-breakpoint
CREATE INDEX `hr_emp_dept_idx` ON `shranix_employees` (`department_id`);--> statement-breakpoint
CREATE INDEX `hr_emp_status_idx` ON `shranix_employees` (`status`);--> statement-breakpoint
CREATE INDEX `hr_emp_user_idx` ON `shranix_employees` (`user_id`);--> statement-breakpoint
CREATE TABLE `shranix_holidays` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`holiday_name` text NOT NULL,
	`holiday_date` text NOT NULL,
	`holiday_type` text DEFAULT 'festival' NOT NULL,
	`branch_id` text,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hr_holiday_date_idx` ON `shranix_holidays` (`holiday_date`);--> statement-breakpoint
CREATE TABLE `shranix_leave_balances` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`employee_id` text NOT NULL,
	`leave_type` text NOT NULL,
	`opening_balance` real DEFAULT 0 NOT NULL,
	`allocated` real DEFAULT 0 NOT NULL,
	`used` real DEFAULT 0 NOT NULL,
	`pending` real DEFAULT 0 NOT NULL,
	`financial_year` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hr_lb_emp_type_idx` ON `shranix_leave_balances` (`employee_id`,`leave_type`);--> statement-breakpoint
CREATE TABLE `shranix_leave_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`employee_id` text NOT NULL,
	`leave_type` text DEFAULT 'casual' NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`number_of_days` real DEFAULT 1 NOT NULL,
	`reason` text,
	`attachment_ref` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_by` text,
	`approval_date` text,
	`remarks` text,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `hr_leave_emp_idx` ON `shranix_leave_requests` (`employee_id`);--> statement-breakpoint
CREATE INDEX `hr_leave_status_idx` ON `shranix_leave_requests` (`status`);--> statement-breakpoint
CREATE TABLE `shranix_payroll_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`payroll_run_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`attendance_days` real DEFAULT 0 NOT NULL,
	`overtime_hours` real DEFAULT 0 NOT NULL,
	`overtime_amount` real DEFAULT 0 NOT NULL,
	`basic_salary` real DEFAULT 0 NOT NULL,
	`hra` real DEFAULT 0 NOT NULL,
	`allowances` real DEFAULT 0 NOT NULL,
	`bonus` real DEFAULT 0 NOT NULL,
	`incentives` real DEFAULT 0 NOT NULL,
	`other_earnings` real DEFAULT 0 NOT NULL,
	`gross_salary` real DEFAULT 0 NOT NULL,
	`pf` real DEFAULT 0 NOT NULL,
	`esi` real DEFAULT 0 NOT NULL,
	`professional_tax` real DEFAULT 0 NOT NULL,
	`tds` real DEFAULT 0 NOT NULL,
	`loan_recovery` real DEFAULT 0 NOT NULL,
	`other_deductions` real DEFAULT 0 NOT NULL,
	`total_deductions` real DEFAULT 0 NOT NULL,
	`net_salary` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `hr_pl_run_idx` ON `shranix_payroll_lines` (`payroll_run_id`);--> statement-breakpoint
CREATE INDEX `hr_pl_emp_idx` ON `shranix_payroll_lines` (`employee_id`);--> statement-breakpoint
CREATE TABLE `shranix_payroll_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`run_number` text NOT NULL,
	`pay_period_start` text NOT NULL,
	`pay_period_end` text NOT NULL,
	`employee_count` integer DEFAULT 0 NOT NULL,
	`gross_total` real DEFAULT 0 NOT NULL,
	`deduction_total` real DEFAULT 0 NOT NULL,
	`net_total` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`paid_at` text,
	`payment_mode` text,
	`gl_entry_id` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hr_pr_run_no_idx` ON `shranix_payroll_runs` (`run_number`);--> statement-breakpoint
CREATE TABLE `shranix_performance_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`employee_id` text NOT NULL,
	`review_period` text NOT NULL,
	`goals` text,
	`achievements` text,
	`rating` real,
	`manager_comments` text,
	`employee_comments` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE INDEX `hr_perf_emp_idx` ON `shranix_performance_reviews` (`employee_id`);--> statement-breakpoint
CREATE TABLE `shranix_salary_structures` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`employee_id` text NOT NULL,
	`effective_from` text,
	`basic_salary` real DEFAULT 0 NOT NULL,
	`hra` real DEFAULT 0 NOT NULL,
	`allowances` real DEFAULT 0 NOT NULL,
	`bonus` real DEFAULT 0 NOT NULL,
	`incentives` real DEFAULT 0 NOT NULL,
	`overtime_rate` real DEFAULT 0 NOT NULL,
	`other_earnings` real DEFAULT 0 NOT NULL,
	`pf` real DEFAULT 0 NOT NULL,
	`esi` real DEFAULT 0 NOT NULL,
	`professional_tax` real DEFAULT 0 NOT NULL,
	`tds` real DEFAULT 0 NOT NULL,
	`loan_recovery` real DEFAULT 0 NOT NULL,
	`other_deductions` real DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `hr_salary_emp_idx` ON `shranix_salary_structures` (`employee_id`);--> statement-breakpoint
CREATE TABLE `shranix_shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`shift_name` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`break_duration_minutes` integer DEFAULT 0 NOT NULL,
	`grace_period_minutes` integer DEFAULT 0 NOT NULL,
	`working_hours` real DEFAULT 8 NOT NULL,
	`late_threshold_minutes` integer DEFAULT 15 NOT NULL,
	`half_day_threshold_minutes` integer DEFAULT 240 NOT NULL,
	`overtime_threshold_minutes` integer DEFAULT 540 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hr_shift_name_idx` ON `shranix_shifts` (`shift_name`);