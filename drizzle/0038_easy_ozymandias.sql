CREATE TABLE "sheets_row" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"source_id" text NOT NULL,
	"external_key" text NOT NULL,
	"contact_id" text,
	"fingerprint" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sheets_source" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"spreadsheet_id" text NOT NULL,
	"sheet_gid" text NOT NULL,
	"interval_minutes" integer DEFAULT 5 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"next_sync_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_status" text DEFAULT 'pending' NOT NULL,
	"last_error" text,
	"last_stats" jsonb,
	"claimed_at" timestamp with time zone,
	"claim_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sheets_source_interval_check" CHECK ("sheets_source"."interval_minutes" between 1 and 1440)
);
--> statement-breakpoint
ALTER TABLE "sheets_row" ADD CONSTRAINT "sheets_row_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sheets_row" ADD CONSTRAINT "sheets_row_source_id_sheets_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sheets_source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sheets_row" ADD CONSTRAINT "sheets_row_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sheets_source" ADD CONSTRAINT "sheets_source_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sheets_row_org_key_uq" ON "sheets_row" USING btree ("organization_id","source_id","external_key");--> statement-breakpoint
CREATE INDEX "sheets_row_org_contact_idx" ON "sheets_row" USING btree ("organization_id","contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sheets_source_org_sheet_uq" ON "sheets_source" USING btree ("organization_id","spreadsheet_id","sheet_gid");--> statement-breakpoint
CREATE INDEX "sheets_source_org_due_idx" ON "sheets_source" USING btree ("organization_id","enabled","next_sync_at");