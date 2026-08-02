CREATE TABLE "contact_report" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"conversation_id" text,
	"reason" text NOT NULL,
	"notes" text,
	"reported_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "blocked_at" timestamp;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "blocked_by_user_id" text;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "block_sync_status" text;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "block_sync_error" text;--> statement-breakpoint
ALTER TABLE "contact_report" ADD CONSTRAINT "contact_report_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_report" ADD CONSTRAINT "contact_report_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_report" ADD CONSTRAINT "contact_report_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_report" ADD CONSTRAINT "contact_report_reported_by_user_id_user_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_report_org_contact_idx" ON "contact_report" USING btree ("organization_id","contact_id","created_at");--> statement-breakpoint
CREATE INDEX "contact_report_org_created_idx" ON "contact_report" USING btree ("organization_id","created_at");--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_blocked_by_user_id_user_id_fk" FOREIGN KEY ("blocked_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_org_blocked_idx" ON "contact" USING btree ("organization_id","blocked_at");