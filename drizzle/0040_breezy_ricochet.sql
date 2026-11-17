CREATE TABLE "sms_lead_source" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_key" text NOT NULL,
	"consent_evidence" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sms_lead_source" ADD CONSTRAINT "sms_lead_source_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sms_lead_source_org_type_key_uq" ON "sms_lead_source" USING btree ("organization_id","source_type","source_key");