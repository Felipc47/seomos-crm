CREATE TABLE "template_dispatch" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"template_id" text,
	"message_id" text,
	"automatic_greeting" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'sending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sheets_row" ADD COLUMN "flow_service_id" text;--> statement-breakpoint
ALTER TABLE "sheets_row" ADD COLUMN "flow_state" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "sheets_row" ADD COLUMN "flow_result" text;--> statement-breakpoint
ALTER TABLE "sheets_row" ADD COLUMN "flow_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sheets_source" ADD COLUMN "service_id" text;--> statement-breakpoint
ALTER TABLE "template_dispatch" ADD CONSTRAINT "template_dispatch_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_dispatch" ADD CONSTRAINT "template_dispatch_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_dispatch" ADD CONSTRAINT "template_dispatch_template_id_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_dispatch" ADD CONSTRAINT "template_dispatch_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "template_dispatch_org_contact_idx" ON "template_dispatch" USING btree ("organization_id","contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "template_dispatch_greeting_uq" ON "template_dispatch" USING btree ("organization_id","contact_id") WHERE "template_dispatch"."automatic_greeting" = true;--> statement-breakpoint
ALTER TABLE "sheets_row" ADD CONSTRAINT "sheets_row_flow_service_id_service_id_fk" FOREIGN KEY ("flow_service_id") REFERENCES "public"."service"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sheets_source" ADD CONSTRAINT "sheets_source_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sheets_row_pending_idx" ON "sheets_row" USING btree ("organization_id","source_id","flow_state");