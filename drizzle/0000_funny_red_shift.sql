CREATE TABLE `leaderboard_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL,
	`last_checkpoint_at` integer NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`finished_at` integer,
	`duration_ms` integer,
	`display_name` text,
	`submitted_at` integer
);
--> statement-breakpoint
CREATE INDEX `leaderboard_finish_order` ON `leaderboard_runs` (`duration_ms`,`finished_at`);