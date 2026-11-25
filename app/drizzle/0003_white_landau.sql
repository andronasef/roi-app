ALTER TABLE `prayer_events` ADD `note` text;--> statement-breakpoint
ALTER TABLE `prayers` ADD `pinned_at` integer;--> statement-breakpoint
ALTER TABLE `prayers` ADD `answered_at` integer;--> statement-breakpoint
ALTER TABLE `prayers` ADD `outcome` text;