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
CREATE TABLE `sync_meta` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`last_content_version` integer DEFAULT 0 NOT NULL,
	`last_checked_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
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