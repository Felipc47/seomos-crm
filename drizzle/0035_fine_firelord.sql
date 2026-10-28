CREATE TABLE "sms_contact" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"consent_evidence" text NOT NULL,
	"consent_at" timestamp DEFAULT now() NOT NULL,
	"opted_out_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"event_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_message" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"direction" text NOT NULL,
	"content" text NOT NULL,
	"sender" text NOT NULL,
	"status" text NOT NULL,
	"provider_message_id" text,
	"error_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sms_connection" ADD COLUMN "sender" text;--> statement-breakpoint
ALTER TABLE "sms_connection" ADD COLUMN "approval_evidence" text;--> statement-breakpoint
ALTER TABLE "sms_connection" ADD COLUMN "delivery_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sms_connection" ADD COLUMN "webhook_id" text;--> statement-breakpoint
ALTER TABLE "sms_connection" ADD COLUMN "webhook_secret" jsonb;--> statement-breakpoint
ALTER TABLE "sms_contact" ADD CONSTRAINT "sms_contact_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_event" ADD CONSTRAINT "sms_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_message" ADD CONSTRAINT "sms_message_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_message" ADD CONSTRAINT "sms_message_contact_id_sms_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."sms_contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sms_contact_org_phone_uq" ON "sms_contact" USING btree ("organization_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX "sms_contact_org_id_uq" ON "sms_contact" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "sms_event_org_key_uq" ON "sms_event" USING btree ("organization_id","event_key");--> statement-breakpoint
CREATE INDEX "sms_event_org_pending_idx" ON "sms_event" USING btree ("organization_id","processed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sms_message_org_operation_uq" ON "sms_message" USING btree ("organization_id","operation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sms_message_org_provider_uq" ON "sms_message" USING btree ("organization_id","provider_message_id");--> statement-breakpoint
CREATE INDEX "sms_message_org_contact_idx" ON "sms_message" USING btree ("organization_id","contact_id","created_at");