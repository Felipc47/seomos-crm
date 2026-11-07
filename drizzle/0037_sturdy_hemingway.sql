ALTER TABLE "organization" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "suspension_reason" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "suspension_message" text;