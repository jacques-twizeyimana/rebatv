CREATE TABLE `admins` (
	`id` binary(16) NOT NULL,
	`email` varchar(254) NOT NULL,
	`password_hash` text NOT NULL,
	`last_login_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `admins_id` PRIMARY KEY(`id`),
	CONSTRAINT `admins_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `channels` (
	`id` binary(16) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`short_name` varchar(12) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` varchar(400),
	`genre` varchar(60) NOT NULL,
	`hue` smallint NOT NULL DEFAULT 210,
	`country_code` char(2) NOT NULL,
	`stream_url` varchar(600),
	`logo_url` varchar(600),
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `channels_id` PRIMARY KEY(`id`),
	CONSTRAINT `channels_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `countries` (
	`code` char(2) NOT NULL,
	`name` varchar(80) NOT NULL,
	`is_market` boolean NOT NULL DEFAULT false,
	`hero_channel_id` binary(16),
	`hero_blurb` varchar(280),
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `countries_code` PRIMARY KEY(`code`)
);
--> statement-breakpoint
CREATE TABLE `featured_channels` (
	`channel_id` binary(16) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `featured_channels_channel_id` PRIMARY KEY(`channel_id`)
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ip` varchar(64) NOT NULL,
	`email` varchar(254) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `login_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `channels` ADD CONSTRAINT `channels_country_code_countries_code_fk` FOREIGN KEY (`country_code`) REFERENCES `countries`(`code`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `featured_channels` ADD CONSTRAINT `featured_channels_channel_id_channels_id_fk` FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `channels_country_idx` ON `channels` (`country_code`,`sort_order`);--> statement-breakpoint
CREATE INDEX `login_attempts_ip_idx` ON `login_attempts` (`ip`,`created_at`);--> statement-breakpoint
CREATE INDEX `login_attempts_email_idx` ON `login_attempts` (`email`,`created_at`);