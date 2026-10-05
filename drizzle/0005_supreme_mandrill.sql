ALTER TABLE `clients` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `design_tasks` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `expenses` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `sales` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `deleted_at` text;
--> statement-breakpoint
CREATE VIEW active_clients AS SELECT rowid AS rowid, * FROM clients WHERE deleted_at IS NULL;

--> statement-breakpoint
CREATE VIEW active_sales AS SELECT rowid AS rowid, * FROM sales WHERE deleted_at IS NULL;

--> statement-breakpoint
CREATE VIEW active_projects AS SELECT rowid AS rowid, * FROM projects WHERE deleted_at IS NULL;

--> statement-breakpoint
CREATE VIEW active_payments AS SELECT rowid AS rowid, * FROM payments WHERE deleted_at IS NULL;

--> statement-breakpoint
CREATE VIEW active_employees AS SELECT rowid AS rowid, * FROM employees WHERE deleted_at IS NULL;

--> statement-breakpoint
CREATE VIEW active_settings AS SELECT rowid AS rowid, * FROM settings WHERE deleted_at IS NULL;

--> statement-breakpoint
CREATE VIEW active_expenses AS SELECT rowid AS rowid, * FROM expenses WHERE deleted_at IS NULL;

--> statement-breakpoint
CREATE VIEW active_design_tasks AS SELECT rowid AS rowid, * FROM design_tasks WHERE deleted_at IS NULL;

--> statement-breakpoint
CREATE VIEW active_tasks AS SELECT rowid AS rowid, * FROM tasks WHERE deleted_at IS NULL;
