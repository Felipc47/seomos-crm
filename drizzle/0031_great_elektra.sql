CREATE TABLE "meeting" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"title" text NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"meet_link" text,
	"timezone" text NOT NULL,
	"source" text NOT NULL,
	"google_event_id" text,
	"reminder_enabled" boolean DEFAULT true NOT NULL,
	"reminder_due_at" timestamp with time zone NOT NULL,
	"reminder_status" text DEFAULT 'pending' NOT NULL,
	"reminder_claimed_at" timestamp with time zone,
	"reminder_sent_at" timestamp with time zone,
	"reminder_message_id" text,
	"reminder_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_org_contact_uq" ON "meeting" USING btree ("organization_id","contact_id");--> statement-breakpoint
CREATE INDEX "meeting_org_due_idx" ON "meeting" USING btree ("organization_id","reminder_status","reminder_due_at");--> statement-breakpoint
-- Recuperar la fecha de reuniones previas sin activar envíos ni adivinar enlaces de notas.
INSERT INTO "meeting" ("id", "organization_id", "contact_id", "title", "start_at", "timezone", "source", "reminder_enabled", "reminder_due_at", "reminder_status")
SELECT 'mtg_legacy_' || c.id, c.organization_id, c.contact_id, 'Reunión',
  c.meeting_scheduled_for AT TIME ZONE 'UTC', 'America/Bogota', 'legacy', false,
  (c.meeting_scheduled_for AT TIME ZONE 'UTC') - interval '45 minutes', 'disabled'
FROM conversation c
WHERE c.meeting_scheduled_for IS NOT NULL AND c.is_test = false
ON CONFLICT (organization_id, contact_id) DO NOTHING;
