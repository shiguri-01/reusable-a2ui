CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`amount` integer NOT NULL,
	`category` text DEFAULT 'その他' NOT NULL,
	`spent_at` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ui_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`surface_id` text DEFAULT 'expense-dashboard' NOT NULL,
	`version` integer NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`messages_json` text NOT NULL,
	`is_active` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
