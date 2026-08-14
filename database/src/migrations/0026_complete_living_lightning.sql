CREATE TABLE `shranix_release_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`channel_code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`min_version` text,
	`recommended_version` text,
	`is_active` integer DEFAULT true NOT NULL,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rc_channel_code_idx` ON `shranix_release_channels` (`channel_code`);--> statement-breakpoint
CREATE TABLE `shranix_release_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`release_id` text NOT NULL,
	`file_name` text NOT NULL,
	`platform` text NOT NULL,
	`architecture` text NOT NULL,
	`package_url` text NOT NULL,
	`package_size` integer,
	`checksum` text NOT NULL,
	`checksum_algorithm` text DEFAULT 'sha256' NOT NULL,
	`signature` text,
	`signature_algorithm` text,
	`signature_metadata` text,
	`status` text DEFAULT 'active' NOT NULL,
	`uploaded_at` text,
	`uploaded_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rp_release_platform_idx` ON `shranix_release_packages` (`release_id`,`platform`,`architecture`);--> statement-breakpoint
CREATE INDEX `rp_release_idx` ON `shranix_release_packages` (`release_id`);--> statement-breakpoint
CREATE TABLE `shranix_software_releases` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`release_id` text NOT NULL,
	`version` text NOT NULL,
	`build_number` text,
	`platform` text DEFAULT 'windows' NOT NULL,
	`architecture` text DEFAULT 'x64' NOT NULL,
	`channel` text DEFAULT 'STABLE' NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`release_notes` text,
	`critical` integer DEFAULT false NOT NULL,
	`released_at` text,
	`created_by` text,
	`published_by` text,
	`published_at` text,
	`deprecated_at` text,
	`revoked_at` text,
	`revocation_reason` text,
	`metadata` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rel_release_id_idx` ON `shranix_software_releases` (`release_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `rel_version_chan_plat_idx` ON `shranix_software_releases` (`version`,`channel`,`platform`,`architecture`);--> statement-breakpoint
CREATE INDEX `rel_channel_idx` ON `shranix_software_releases` (`channel`);--> statement-breakpoint
CREATE INDEX `rel_status_idx` ON `shranix_software_releases` (`status`);--> statement-breakpoint
CREATE INDEX `rel_published_at_idx` ON `shranix_software_releases` (`published_at`);--> statement-breakpoint
CREATE TABLE `shranix_version_compatibility` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`version` text NOT NULL,
	`channel` text DEFAULT 'STABLE' NOT NULL,
	`min_supported_version` text,
	`recommended_version` text,
	`blocked` integer DEFAULT false NOT NULL,
	`blocked_reason` text,
	`critical` integer DEFAULT false NOT NULL,
	`notes` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vc_version_channel_idx` ON `shranix_version_compatibility` (`version`,`channel`);--> statement-breakpoint
CREATE INDEX `vc_channel_idx` ON `shranix_version_compatibility` (`channel`);