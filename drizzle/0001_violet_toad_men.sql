PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uid` text NOT NULL,
	`fortune_pk` integer NOT NULL,
	`reaction` integer NOT NULL,
	`comment` text NOT NULL,
	`neoname` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`fortune_pk`) REFERENCES `fortune`(`pk`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_feedback`("id", "uid", "fortune_pk", "reaction", "comment", "neoname", "created_at") SELECT "id", "uid", "fortune_pk", "reaction", "comment", "neoname", "created_at" FROM `feedback`;--> statement-breakpoint
DROP TABLE `feedback`;--> statement-breakpoint
ALTER TABLE `__new_feedback` RENAME TO `feedback`;--> statement-breakpoint
PRAGMA foreign_keys=ON;