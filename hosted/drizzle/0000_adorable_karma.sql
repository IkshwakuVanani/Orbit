CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`notes` text NOT NULL,
	`project` text NOT NULL,
	`priority` text NOT NULL,
	`status` text NOT NULL,
	`due_date` text,
	`created_at` text NOT NULL
);
