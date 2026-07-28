ALTER TABLE "lead" ADD COLUMN "service_id" text;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "assigned_member_id" text;--> statement-breakpoint
ALTER TABLE "service" ADD COLUMN "assigned_member_id" text;--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_assigned_member_id_member_id_fk" FOREIGN KEY ("assigned_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service" ADD CONSTRAINT "service_assigned_member_id_member_id_fk" FOREIGN KEY ("assigned_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_org_assignee_idx" ON "lead" USING btree ("organization_id","assigned_member_id");--> statement-breakpoint
CREATE INDEX "service_org_assignee_idx" ON "service" USING btree ("organization_id","assigned_member_id");