ALTER TABLE "sms_contact" ADD COLUMN "ai_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sms_message" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;