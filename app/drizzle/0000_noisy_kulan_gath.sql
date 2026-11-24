CREATE TABLE `gratitude_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`local_date` text NOT NULL,
	`body` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gratitude_lines_local_date_unique` ON `gratitude_lines` (`local_date`);--> statement-breakpoint
CREATE TABLE `mem_verses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`verse_id` text NOT NULL,
	`fsrs` text,
	`fsrs_model` text
);
--> statement-breakpoint
CREATE TABLE `prayer_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`prayer_id` text NOT NULL,
	`prayed_at` integer NOT NULL,
	`local_date` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `prayer_events_parent_idx` ON `prayer_events` (`prayer_id`,`deleted_at`);--> statement-breakpoint
CREATE TABLE `prayers` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`body` text NOT NULL,
	`person_name` text,
	`since_local_date` text
);
--> statement-breakpoint
CREATE TABLE `review_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`mem_verse_id` text NOT NULL,
	`rating` integer NOT NULL,
	`reviewed_at` integer NOT NULL,
	`local_date` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `review_events_parent_idx` ON `review_events` (`mem_verse_id`,`deleted_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`value` text NOT NULL
);
