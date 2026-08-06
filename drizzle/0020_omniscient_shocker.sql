CREATE TABLE "template_media" (
	"template_id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"bytes" "bytea" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "template" ADD COLUMN "header_kind" text;--> statement-breakpoint
ALTER TABLE "template" ADD COLUMN "header_filename" text;--> statement-breakpoint
ALTER TABLE "template" ADD COLUMN "header_mime" text;--> statement-breakpoint
ALTER TABLE "template" ADD COLUMN "header_media_id" text;--> statement-breakpoint
ALTER TABLE "template" ADD COLUMN "header_media_uploaded_at" timestamp;--> statement-breakpoint
ALTER TABLE "template_media" ADD CONSTRAINT "template_media_template_id_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_media" ADD CONSTRAINT "template_media_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;