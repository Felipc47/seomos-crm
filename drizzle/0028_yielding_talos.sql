ALTER TABLE "organization" ADD COLUMN "mailing_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
-- Piloto autorizado: identidad de la empresa Seomos verificada en producción.
-- No habilitar por nombre ambiguo ni empresas creadas posteriormente.
UPDATE "organization" SET "mailing_enabled" = true
WHERE "id" = 'org_9rtxjmozs3xgoy3bb3z8' AND "slug" = 'principal' AND "deleted_at" IS NULL;
