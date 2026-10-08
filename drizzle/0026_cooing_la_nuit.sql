CREATE TABLE "mailing_enrollment" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"program_id" text NOT NULL,
	"subscriber_id" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"stopped_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "mailing_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"send_id" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"kind" text NOT NULL,
	"occurred_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailing_list" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailing_list_member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"list_id" text NOT NULL,
	"subscriber_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailing_program" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"list_id" text NOT NULL,
	"steps" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"auto_enroll" boolean DEFAULT false NOT NULL,
	"scheduled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailing_send" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"program_id" text NOT NULL,
	"enrollment_id" text NOT NULL,
	"subscriber_id" text NOT NULL,
	"step_index" integer NOT NULL,
	"due_at" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"next_attempt_at" timestamp,
	"first_attempt_at" timestamp,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lease_until" timestamp,
	"payload" jsonb,
	"provider_message_id" text,
	"last_error" text,
	"accepted_at" timestamp,
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"outcome" text
);
--> statement-breakpoint
CREATE TABLE "mailing_sender" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"provider_domain_id" text,
	"from_email" text NOT NULL,
	"from_name" text NOT NULL,
	"reply_to" text,
	"status" text DEFAULT 'not_started' NOT NULL,
	"records" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_error" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailing_subscriber" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"consent_at" timestamp,
	"unsubscribed_at" timestamp,
	"suppressed_at" timestamp,
	"suppression_reason" text,
	"unsubscribe_token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mailing_enrollment" ADD CONSTRAINT "mailing_enrollment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_enrollment" ADD CONSTRAINT "mailing_enrollment_program_id_mailing_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."mailing_program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_enrollment" ADD CONSTRAINT "mailing_enrollment_subscriber_id_mailing_subscriber_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."mailing_subscriber"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_event" ADD CONSTRAINT "mailing_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_event" ADD CONSTRAINT "mailing_event_send_id_mailing_send_id_fk" FOREIGN KEY ("send_id") REFERENCES "public"."mailing_send"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_list" ADD CONSTRAINT "mailing_list_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_list_member" ADD CONSTRAINT "mailing_list_member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_list_member" ADD CONSTRAINT "mailing_list_member_list_id_mailing_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."mailing_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_list_member" ADD CONSTRAINT "mailing_list_member_subscriber_id_mailing_subscriber_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."mailing_subscriber"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_program" ADD CONSTRAINT "mailing_program_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_program" ADD CONSTRAINT "mailing_program_list_id_mailing_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."mailing_list"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_send" ADD CONSTRAINT "mailing_send_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_send" ADD CONSTRAINT "mailing_send_program_id_mailing_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."mailing_program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_send" ADD CONSTRAINT "mailing_send_enrollment_id_mailing_enrollment_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."mailing_enrollment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_send" ADD CONSTRAINT "mailing_send_subscriber_id_mailing_subscriber_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."mailing_subscriber"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_sender" ADD CONSTRAINT "mailing_sender_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_subscriber" ADD CONSTRAINT "mailing_subscriber_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mailing_enrollment_org_program_sub_uq" ON "mailing_enrollment" USING btree ("organization_id","program_id","subscriber_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mailing_event_org_provider_uq" ON "mailing_event" USING btree ("organization_id","provider_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mailing_list_org_name_uq" ON "mailing_list" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "mailing_member_org_list_sub_uq" ON "mailing_list_member" USING btree ("organization_id","list_id","subscriber_id");--> statement-breakpoint
CREATE INDEX "mailing_program_org_status_idx" ON "mailing_program" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "mailing_send_org_identity_uq" ON "mailing_send" USING btree ("organization_id","program_id","subscriber_id","step_index");--> statement-breakpoint
CREATE INDEX "mailing_send_org_due_idx" ON "mailing_send" USING btree ("organization_id","status","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mailing_send_provider_uq" ON "mailing_send" USING btree ("provider_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mailing_sender_domain_uq" ON "mailing_sender" USING btree ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX "mailing_subscriber_org_email_uq" ON "mailing_subscriber" USING btree ("organization_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "mailing_subscriber_token_uq" ON "mailing_subscriber" USING btree ("unsubscribe_token");