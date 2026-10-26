ALTER TABLE "agent_profile" ADD COLUMN "mission" text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_profile" ADD COLUMN "mission_details" text;--> statement-breakpoint
ALTER TABLE "agent_profile" ADD COLUMN "ecommerce_url" text;--> statement-breakpoint
ALTER TABLE "agent_profile" ADD COLUMN "scheduling_warmup_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_profile" ADD COLUMN "scheduling_warmup_messages" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_profile" ADD CONSTRAINT "agent_profile_mission_check" CHECK ("agent_profile"."mission" in ('legacy', 'schedule', 'sales', 'ecommerce', 'qualify', 'support', 'inform', 'custom'));--> statement-breakpoint
ALTER TABLE "agent_profile" ADD CONSTRAINT "agent_profile_warmup_messages_check" CHECK ("agent_profile"."scheduling_warmup_messages" between 1 and 50);