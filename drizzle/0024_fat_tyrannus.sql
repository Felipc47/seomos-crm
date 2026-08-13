CREATE TABLE "web_form_integration" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"service_id" text,
	"secret_cipher" text NOT NULL,
	"secret_iv" text NOT NULL,
	"secret_tag" text NOT NULL,
	"secret_last4" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"last_status" text,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_form_submission" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"integration_id" text NOT NULL,
	"external_id" text NOT NULL,
	"contact_id" text,
	"lead_id" text,
	"status" text DEFAULT 'processing' NOT NULL,
	"greeting_attempted_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "web_form_integration" ADD CONSTRAINT "web_form_integration_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_form_integration" ADD CONSTRAINT "web_form_integration_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_form_submission" ADD CONSTRAINT "web_form_submission_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_form_submission" ADD CONSTRAINT "web_form_submission_integration_id_web_form_integration_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."web_form_integration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_form_submission" ADD CONSTRAINT "web_form_submission_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_form_submission" ADD CONSTRAINT "web_form_submission_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "web_form_integration_org_created_idx" ON "web_form_integration" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "web_form_submission_org_external_uq" ON "web_form_submission" USING btree ("organization_id","integration_id","external_id");--> statement-breakpoint
CREATE INDEX "web_form_submission_org_integration_idx" ON "web_form_submission" USING btree ("organization_id","integration_id","created_at");