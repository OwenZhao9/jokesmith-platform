CREATE TABLE `brainstorms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`topic` varchar(256) NOT NULL,
	`angles` json,
	`associations` json,
	`punchlines` json,
	`rawResponse` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `brainstorms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inspirations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`source` varchar(256),
	`tags` json,
	`isConverted` boolean NOT NULL DEFAULT false,
	`convertedScriptId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inspirations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scripts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`content` text NOT NULL,
	`category` enum('politics','life','roast','relationship','work','family','tech','other') NOT NULL DEFAULT 'other',
	`tags` json,
	`isPublic` boolean NOT NULL DEFAULT false,
	`performanceCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scripts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `show_scripts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`showId` int NOT NULL,
	`scriptId` int NOT NULL,
	`orderIndex` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `show_scripts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`venue` varchar(256),
	`showDate` timestamp NOT NULL,
	`duration` int,
	`notes` text,
	`status` enum('planned','completed','cancelled') NOT NULL DEFAULT 'planned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transcriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`audioUrl` varchar(512) NOT NULL,
	`audioKey` varchar(256) NOT NULL,
	`transcribedText` text,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`convertedScriptId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transcriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_styles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`comedyStyle` text,
	`languageHabits` text,
	`commonTags` json,
	`tonePreference` varchar(64),
	`targetAudience` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_styles_id` PRIMARY KEY(`id`)
);
