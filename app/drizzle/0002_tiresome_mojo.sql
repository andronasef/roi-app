CREATE TABLE `favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`item_kind` text NOT NULL,
	`item_source` text NOT NULL,
	`item_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `favorites_live_created_idx` ON `favorites` (`deleted_at`,`created_at`);--> statement-breakpoint
CREATE TABLE `personal_items` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`text` text NOT NULL,
	`verse_ref` text
);
--> statement-breakpoint
CREATE INDEX `personal_items_kind_live_idx` ON `personal_items` (`kind`,`deleted_at`,`created_at`);--> statement-breakpoint
CREATE TABLE `verse_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`period_type` text NOT NULL,
	`period_key` text NOT NULL,
	`verse_id` text NOT NULL,
	`ref` text NOT NULL,
	`text` text NOT NULL,
	`text_female` text,
	`assigned_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verse_assignments_period_idx` ON `verse_assignments` (`period_type`,`period_key`,`deleted_at`);