CREATE TABLE `sales_agreements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`effective_month` text NOT NULL,
	`end_month` text,
	`mode` text NOT NULL,
	`salary` integer DEFAULT 0 NOT NULL,
	`rate` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sales_agreements_user_month` ON `sales_agreements` (`user_id`,`effective_month`);--> statement-breakpoint
ALTER TABLE `sale_owners` ADD `commission_rate` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sale_owners` ADD `agreement_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `deleted_at` text;