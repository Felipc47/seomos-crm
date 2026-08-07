-- Regla nueva: el comercial del servicio se marca en el lead únicamente al
-- DERIVAR la conversación a atención humana, no al llegar/clasificar.
-- Retroactivo en ambas direcciones y re-ejecutable (Principio IV).

-- 1) Conversación real ya derivada + servicio con comercial elegible + lead
--    sin responsable → completar la asignación que la regla nueva habría hecho.
UPDATE "lead" l
SET assigned_member_id = s.assigned_member_id, updated_at = now()
FROM service s
JOIN member m ON m.id = s.assigned_member_id
WHERE s.id = l.service_id
  AND s.organization_id = l.organization_id
  AND m.organization_id = l.organization_id
  AND m.role IN ('commercial', 'member')
  AND l.assigned_member_id IS NULL
  AND EXISTS (
    SELECT 1 FROM conversation c
    WHERE c.organization_id = l.organization_id
      AND c.contact_id = l.contact_id
      AND c.is_test = false
      AND c.handoff_at IS NOT NULL
  );--> statement-breakpoint

-- 2) Asignación automática prematura (el responsable coincide con el comercial
--    del servicio) sin derivación → liberar. Las transferencias manuales a
--    OTRA persona no coinciden con el patrón y se conservan.
UPDATE "lead" l
SET assigned_member_id = NULL, updated_at = now()
FROM service s
WHERE s.id = l.service_id
  AND s.organization_id = l.organization_id
  AND l.assigned_member_id = s.assigned_member_id
  AND NOT EXISTS (
    SELECT 1 FROM conversation c
    WHERE c.organization_id = l.organization_id
      AND c.contact_id = l.contact_id
      AND c.is_test = false
      AND c.handoff_at IS NOT NULL
  );
