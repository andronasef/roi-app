CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`content_version` integer NOT NULL,
	`summary_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_log_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `blessings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`text` text NOT NULL,
	`text_female` text,
	`version` integer NOT NULL,
	`sort_order` integer,
	`tags_json` text,
	`title` text NOT NULL,
	`verse_ref` text
);
--> statement-breakpoint
CREATE INDEX `blessings_version_idx` ON `blessings` (`version`);--> statement-breakpoint
CREATE INDEX `blessings_live_order_idx` ON `blessings` (`deleted_at`,`sort_order`);--> statement-breakpoint
CREATE TABLE `content_meta` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`content_version` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `names_of_god` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`text` text NOT NULL,
	`text_female` text,
	`version` integer NOT NULL,
	`sort_order` integer,
	`tags_json` text,
	`title` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `names_of_god_version_idx` ON `names_of_god` (`version`);--> statement-breakpoint
CREATE INDEX `names_of_god_live_order_idx` ON `names_of_god` (`deleted_at`,`sort_order`);--> statement-breakpoint
CREATE TABLE `suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`text` text NOT NULL,
	`text_female` text,
	`verse_ref` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`google_sub` text NOT NULL,
	`email` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `suggestions_sub_created_idx` ON `suggestions` (`google_sub`,`created_at`);--> statement-breakpoint
CREATE TABLE `verses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`text` text NOT NULL,
	`text_female` text,
	`version` integer NOT NULL,
	`sort_order` integer,
	`tags_json` text,
	`ref` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verses_version_idx` ON `verses` (`version`);--> statement-breakpoint
CREATE INDEX `verses_live_order_idx` ON `verses` (`deleted_at`,`sort_order`);