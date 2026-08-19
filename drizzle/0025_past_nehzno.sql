CREATE TABLE "ai_credit_account" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"total_granted" integer DEFAULT 0 NOT NULL,
	"total_used" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_credit_account_balance_nonnegative" CHECK ("ai_credit_account"."balance" >= 0),
	CONSTRAINT "ai_credit_account_total_granted_nonnegative" CHECK ("ai_credit_account"."total_granted" >= 0),
	CONSTRAINT "ai_credit_account_total_used_nonnegative" CHECK ("ai_credit_account"."total_used" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ai_credit_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"delta" integer NOT NULL,
	"kind" text NOT NULL,
	"reference_key" text NOT NULL,
	"actor_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_credit_entry_delta_nonzero" CHECK ("ai_credit_entry"."delta" <> 0)
);
--> statement-breakpoint
ALTER TABLE "ai_credit_account" ADD CONSTRAINT "ai_credit_account_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_credit_entry" ADD CONSTRAINT "ai_credit_entry_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_credit_entry" ADD CONSTRAINT "ai_credit_entry_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_credit_entry_org_reference_uq" ON "ai_credit_entry" USING btree ("organization_id","reference_key");--> statement-breakpoint
CREATE INDEX "ai_credit_entry_org_created_idx" ON "ai_credit_entry" USING btree ("organization_id","created_at");--> statement-breakpoint
INSERT INTO "ai_credit_account" ("organization_id", "balance", "total_granted")
SELECT "id", 1000, 1000 FROM "organization"
ON CONFLICT ("organization_id") DO NOTHING;--> statement-breakpoint
INSERT INTO "ai_credit_entry" ("id", "organization_id", "delta", "kind", "reference_key")
SELECT 'aic_migration_025_' || "id", "id", 1000, 'migration_grant', 'migration-grant:025'
FROM "organization"
ON CONFLICT ("organization_id", "reference_key") DO NOTHING;
