ALTER TABLE "lead" ADD COLUMN "follow_up_due_at" timestamp;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "follow_up_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "lead_follow_up_due_idx" ON "lead" USING btree ("follow_up_due_at");--> statement-breakpoint
-- 008: sembrar las etapas de seguimiento en las organizaciones existentes
-- (idempotente: solo si la org no tiene ya una etapa de ese kind). Las nuevas
-- se anexan al final del tablero; el operador puede reordenarlas.
INSERT INTO "pipeline_stage" ("id", "organization_id", "name", "position", "kind")
SELECT 'stg_' || substr(md5(random()::text || o."id" || 'follow_up'), 1, 20), o."id", 'Contactar luego',
       COALESCE((SELECT MAX(s."position") FROM "pipeline_stage" s WHERE s."organization_id" = o."id"), -1) + 1,
       'follow_up'
FROM "organization" o
WHERE NOT EXISTS (SELECT 1 FROM "pipeline_stage" s WHERE s."organization_id" = o."id" AND s."kind" = 'follow_up');--> statement-breakpoint
INSERT INTO "pipeline_stage" ("id", "organization_id", "name", "position", "kind")
SELECT 'stg_' || substr(md5(random()::text || o."id" || 'no_reply'), 1, 20), o."id", 'No contestó',
       COALESCE((SELECT MAX(s."position") FROM "pipeline_stage" s WHERE s."organization_id" = o."id"), -1) + 1,
       'no_reply'
FROM "organization" o
WHERE NOT EXISTS (SELECT 1 FROM "pipeline_stage" s WHERE s."organization_id" = o."id" AND s."kind" = 'no_reply');--> statement-breakpoint
INSERT INTO "pipeline_stage" ("id", "organization_id", "name", "position", "kind")
SELECT 'stg_' || substr(md5(random()::text || o."id" || 'no_interest'), 1, 20), o."id", 'No interesado',
       COALESCE((SELECT MAX(s."position") FROM "pipeline_stage" s WHERE s."organization_id" = o."id"), -1) + 1,
       'no_interest'
FROM "organization" o
WHERE NOT EXISTS (SELECT 1 FROM "pipeline_stage" s WHERE s."organization_id" = o."id" AND s."kind" = 'no_interest');
