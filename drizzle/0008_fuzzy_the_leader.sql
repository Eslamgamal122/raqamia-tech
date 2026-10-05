CREATE TABLE `project_members` (
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_members_unique` ON `project_members` (`project_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `project_members_user` ON `project_members` (`user_id`,`project_id`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `assignee_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `tasks` ADD `work_status` text DEFAULT 'todo' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `active` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
UPDATE tasks SET work_status='done' WHERE done=1;
