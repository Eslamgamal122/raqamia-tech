CREATE TABLE `project_portal` (
	`project_id` text PRIMARY KEY NOT NULL,
	`preview_url` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`shared_tasks` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `site_connections` (
	`project_id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`site_url` text NOT NULL,
	`key_hash` text,
	`credentials` text,
	`payload` text DEFAULT '{}' NOT NULL,
	`last_seen` text,
	`last_attempt` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `users` ADD `client_id` text REFERENCES clients(id);