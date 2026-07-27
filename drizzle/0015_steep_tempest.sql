ALTER TABLE "lead" ADD COLUMN "closure_reason" text;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "closed_at" timestamp;--> statement-breakpoint

-- 009: consolidar el embudo sin perder leads ni seguimientos programados.
-- Primero normalizamos los nombres que ya representaban la misma intención.
UPDATE "pipeline_stage"
SET "name" = 'En calificación'
WHERE "kind" = 'open' AND lower("name") = 'en conversación';--> statement-breakpoint
UPDATE "pipeline_stage"
SET "name" = 'Calificado'
WHERE "kind" = 'open' AND lower("name") = 'interesado';--> statement-breakpoint
UPDATE "pipeline_stage"
SET "name" = 'Cita agendada'
WHERE "kind" = 'scheduled';--> statement-breakpoint
UPDATE "pipeline_stage"
SET "name" = 'No convertido'
WHERE "kind" = 'lost';--> statement-breakpoint

-- Garantiza las siete etapas canónicas también en organizaciones antiguas
-- que hayan renombrado o eliminado alguna etapa abierta.
INSERT INTO "pipeline_stage" ("id", "organization_id", "name", "position", "kind")
SELECT 'stg_' || substr(md5(random()::text || o."id" || 'new'), 1, 20),
       o."id", 'Nuevo', 0, 'open'
FROM "organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "pipeline_stage" s
  WHERE s."organization_id" = o."id"
    AND s."kind" = 'open' AND lower(s."name") = 'nuevo'
);--> statement-breakpoint
INSERT INTO "pipeline_stage" ("id", "organization_id", "name", "position", "kind")
SELECT 'stg_' || substr(md5(random()::text || o."id" || 'qualifying'), 1, 20),
       o."id", 'En calificación', 1, 'open'
FROM "organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "pipeline_stage" s
  WHERE s."organization_id" = o."id"
    AND s."kind" = 'open' AND lower(s."name") = 'en calificación'
);--> statement-breakpoint
INSERT INTO "pipeline_stage" ("id", "organization_id", "name", "position", "kind")
SELECT 'stg_' || substr(md5(random()::text || o."id" || 'qualified'), 1, 20),
       o."id", 'Calificado', 2, 'open'
FROM "organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "pipeline_stage" s
  WHERE s."organization_id" = o."id"
    AND s."kind" = 'open' AND lower(s."name") = 'calificado'
);--> statement-breakpoint
INSERT INTO "pipeline_stage" ("id", "organization_id", "name", "position", "kind")
SELECT 'stg_' || substr(md5(random()::text || o."id" || 'scheduled'), 1, 20),
       o."id", 'Cita agendada', 3, 'scheduled'
FROM "organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "pipeline_stage" s
  WHERE s."organization_id" = o."id" AND s."kind" = 'scheduled'
);--> statement-breakpoint
INSERT INTO "pipeline_stage" ("id", "organization_id", "name", "position", "kind")
SELECT 'stg_' || substr(md5(random()::text || o."id" || 'won'), 1, 20),
       o."id", 'Cliente', 4, 'won'
FROM "organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "pipeline_stage" s
  WHERE s."organization_id" = o."id" AND s."kind" = 'won'
);--> statement-breakpoint
INSERT INTO "pipeline_stage" ("id", "organization_id", "name", "position", "kind")
SELECT 'stg_' || substr(md5(random()::text || o."id" || 'unqualified'), 1, 20),
       o."id", 'No calificado', 5, 'unqualified'
FROM "organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "pipeline_stage" s
  WHERE s."organization_id" = o."id" AND s."kind" = 'unqualified'
);--> statement-breakpoint
INSERT INTO "pipeline_stage" ("id", "organization_id", "name", "position", "kind")
SELECT 'stg_' || substr(md5(random()::text || o."id" || 'lost'), 1, 20),
       o."id", 'No convertido', 6, 'lost'
FROM "organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "pipeline_stage" s
  WHERE s."organization_id" = o."id" AND s."kind" = 'lost'
);--> statement-breakpoint

-- «Contactar luego» y «No contestó» dejan de ser columnas: su estado ya vive
-- en follow_up_due_at/follow_up_attempts. Se conservan fecha e intentos.
UPDATE "lead" l
SET "stage_id" = target."id", "updated_at" = now()
FROM "pipeline_stage" old
JOIN LATERAL (
  SELECT t."id"
  FROM "pipeline_stage" t
  WHERE t."organization_id" = old."organization_id"
    AND t."kind" = 'open'
    AND lower(t."name") = 'en calificación'
  ORDER BY t."position", t."id"
  LIMIT 1
) target ON true
WHERE l."stage_id" = old."id"
  AND old."kind" IN ('follow_up', 'no_reply');--> statement-breakpoint

-- «No interesado» se integra en No convertido. Los cierres generados por la
-- rutina de seguimiento reciben un motivo útil para reportes.
UPDATE "lead" l
SET "stage_id" = target."id",
    "closure_reason" = COALESCE(l."closure_reason", 'no_response'),
    "closed_at" = COALESCE(l."closed_at", l."updated_at", now()),
    "follow_up_due_at" = NULL,
    "follow_up_attempts" = 0,
    "updated_at" = now()
FROM "pipeline_stage" old
JOIN LATERAL (
  SELECT t."id"
  FROM "pipeline_stage" t
  WHERE t."organization_id" = old."organization_id" AND t."kind" = 'lost'
  ORDER BY t."position", t."id"
  LIMIT 1
) target ON true
WHERE l."stage_id" = old."id" AND old."kind" = 'no_interest';--> statement-breakpoint

-- Los cierres históricos no tenían un catálogo de motivos.
UPDATE "lead" l
SET "closure_reason" = COALESCE(l."closure_reason", 'other'),
    "closed_at" = COALESCE(l."closed_at", l."updated_at", now())
FROM "pipeline_stage" s
WHERE l."stage_id" = s."id" AND s."kind" = 'lost';--> statement-breakpoint
UPDATE "lead" l
SET "closed_at" = COALESCE(l."closed_at", l."updated_at", now())
FROM "pipeline_stage" s
WHERE l."stage_id" = s."id" AND s."kind" = 'won';--> statement-breakpoint

DELETE FROM "pipeline_stage"
WHERE "kind" IN ('follow_up', 'no_reply', 'no_interest');--> statement-breakpoint

-- Si una organización ya había creado manualmente una etapa con el nuevo
-- nombre, se consolidan las duplicadas canónicas antes de ordenar el tablero.
WITH ranked AS (
  SELECT "id",
         first_value("id") OVER (
           PARTITION BY "organization_id", lower("name")
           ORDER BY "position", "id"
         ) AS keep_id,
         row_number() OVER (
           PARTITION BY "organization_id", lower("name")
           ORDER BY "position", "id"
         ) AS rn
  FROM "pipeline_stage"
  WHERE "kind" = 'open'
    AND lower("name") IN ('nuevo', 'en calificación', 'calificado')
)
UPDATE "lead" l
SET "stage_id" = ranked.keep_id, "updated_at" = now()
FROM ranked
WHERE ranked.rn > 1 AND l."stage_id" = ranked."id";--> statement-breakpoint
WITH ranked AS (
  SELECT "id",
         row_number() OVER (
           PARTITION BY "organization_id", lower("name")
           ORDER BY "position", "id"
         ) AS rn
  FROM "pipeline_stage"
  WHERE "kind" = 'open'
    AND lower("name") IN ('nuevo', 'en calificación', 'calificado')
)
DELETE FROM "pipeline_stage" s
USING ranked
WHERE ranked.rn > 1 AND s."id" = ranked."id";--> statement-breakpoint

UPDATE "pipeline_stage"
SET "position" = CASE
  WHEN "kind" = 'open' AND lower("name") = 'nuevo' THEN 0
  WHEN "kind" = 'open' AND lower("name") = 'en calificación' THEN 1
  WHEN "kind" = 'open' AND lower("name") = 'calificado' THEN 2
  WHEN "kind" = 'scheduled' THEN 3
  WHEN "kind" = 'won' THEN 4
  WHEN "kind" = 'unqualified' THEN 5
  WHEN "kind" = 'lost' THEN 6
  ELSE "position"
END
WHERE ("kind" = 'open' AND lower("name") IN ('nuevo', 'en calificación', 'calificado'))
   OR "kind" IN ('scheduled', 'won', 'unqualified', 'lost');--> statement-breakpoint
WITH custom AS (
  SELECT "id",
         row_number() OVER (
           PARTITION BY "organization_id"
           ORDER BY "position", "id"
         ) AS rn
  FROM "pipeline_stage"
  WHERE NOT (
    ("kind" = 'open' AND lower("name") IN ('nuevo', 'en calificación', 'calificado'))
    OR "kind" IN ('scheduled', 'won', 'unqualified', 'lost')
  )
)
UPDATE "pipeline_stage" s
SET "position" = 6 + custom.rn
FROM custom
WHERE s."id" = custom."id";
