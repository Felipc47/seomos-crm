CREATE TABLE "commerce_catalog" (
	"organization_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"products" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_connection" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"provider" text NOT NULL,
	"url" text NOT NULL,
	"currency" text NOT NULL,
	"secret_cipher" text NOT NULL,
	"secret_iv" text NOT NULL,
	"secret_tag" text NOT NULL,
	"orders_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_provider_check" CHECK ("commerce_connection"."provider" in ('woocommerce','shopify'))
);
--> statement-breakpoint
CREATE TABLE "commerce_quote" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"quote" jsonb NOT NULL,
	"status" text DEFAULT 'prepared' NOT NULL,
	"remote_id" text,
	"remote_reference" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_quote_status_check" CHECK ("commerce_quote"."status" in ('prepared','submitting','created','uncertain','cancelled'))
);
--> statement-breakpoint
ALTER TABLE "commerce_catalog" ADD CONSTRAINT "commerce_catalog_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_catalog" ADD CONSTRAINT "commerce_catalog_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_connection" ADD CONSTRAINT "commerce_connection_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_quote" ADD CONSTRAINT "commerce_quote_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_quote" ADD CONSTRAINT "commerce_quote_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_quote" ADD CONSTRAINT "commerce_quote_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_catalog_org_conv_uq" ON "commerce_catalog" USING btree ("organization_id","conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_connection_org_uq" ON "commerce_connection" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "commerce_quote_org_conv_idx" ON "commerce_quote" USING btree ("organization_id","conversation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_quote_active_org_conv_uq" ON "commerce_quote" USING btree ("organization_id","conversation_id") WHERE "commerce_quote"."status" in ('prepared','submitting','uncertain');