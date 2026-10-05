CREATE TABLE `sale_owners` (
	`sale_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sale_owners_user` ON `sale_owners` (`user_id`,`sale_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `job_title` text DEFAULT '' NOT NULL;