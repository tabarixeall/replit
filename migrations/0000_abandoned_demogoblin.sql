CREATE TABLE "bulk_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"total_contacts" integer NOT NULL,
	"completed_calls" integer DEFAULT 0,
	"failed_calls" integer DEFAULT 0,
	"status" text NOT NULL,
	"region" text NOT NULL,
	"call_from" text NOT NULL,
	"user_id" integer NOT NULL,
	"max_contacts" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"call_from" text NOT NULL,
	"call_to" text NOT NULL,
	"region" text NOT NULL,
	"status" text NOT NULL,
	"duration" text,
	"call_id" text,
	"error_message" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user_id" integer,
	"credits_cost" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "campaign_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"active_campaign_id" integer,
	"active_user_id" integer,
	"is_xml_locked" integer DEFAULT 0,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"phone" text NOT NULL,
	"original_phone" text NOT NULL,
	"bulk_call_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"details" text,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"role" text DEFAULT 'user',
	"status" text DEFAULT 'active',
	"credits" integer DEFAULT 0,
	"last_login_at" timestamp,
	"total_calls" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhook_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_number" text NOT NULL,
	"button_pressed" text NOT NULL,
	"bulk_call_id" integer,
	"contact_id" integer,
	"contact_name" text,
	"contact_email" text,
	"campaign_name" text,
	"user_id" integer,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xml_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"intro_file" text DEFAULT 'intro.wav',
	"outro_file" text DEFAULT 'outro.wav',
	"connect_action" text DEFAULT 'https://vi-2-xeallrender.replit.app/connect',
	"input_timeout" integer DEFAULT 50000,
	"wait_time" integer DEFAULT 2,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
