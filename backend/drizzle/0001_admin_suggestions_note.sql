ALTER TABLE `suggestions` ADD `moderation_note` text;--> statement-breakpoint
CREATE INDEX `suggestions_status_created_idx` ON `suggestions` (`status`,`created_at`);