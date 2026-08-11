# Tasks 018 — Variables de plantilla

- [x] T1. Schema: `template.variables` jsonb + migración **0022** (la 0021 ya existía: asignación-al-derivar)
- [x] T2. `template-vars.ts`: catálogo, validación, ejemplos, resolución
- [x] T3. templates.ts: create/update/submit con ejemplos N-arios; sendTemplate resuelve por contacto
- [x] T4. API: campo `variables` en POST/PATCH (JSON y multipart) + serializer/DTO
- [x] T5. Campañas: createCampaign sin variableMode para mapeadas; UI con resumen de mapeo
- [x] T6. UI plantillas: editor de mapeo por variable (fuente + fijo + respaldo)
- [x] T7. Bandeja: template-sender sin input para mapeadas
- [x] T8. Unit tests: 13 nuevos (validación + resolución + ejemplos + parseo)
- [x] T9. Gate técnico verde (typecheck+lint+build+240 tests)
- [x] T10. E2E con mocks — TODO VERDE (2026-08-11):
  - Campaña a 2 contactos: params por destinatario distintos — servicio real
    «Desarrollo web» vs respaldo «nuestros servicios»; fijo en ambos.
  - {{1}}=correo sin respaldo → destinatario failed con mensaje claro y
    campaña `done` (no pausada); el que sí tenía correo salió `sent`.
  - Legacy sin mapeo + variableMode fixed → un parámetro, intacto.
  - Envío manual sin input: texto final «Hola Cliente, vimos tu interés en
    Desarrollo web…» resuelto en servidor.
  - 422: saltos {{1}}/{{3}} · 6 variables · fijo vacío · dos variables sin
    mapeo. UI verificada: editor por variable y resumen en campañas.

Nota entorno (2026-08-11): el node de Homebrew quedó roto (libsimdjson) y se
reinstaló (v26); el Postgres local que servía era un proceso huérfano con
data dir borrado — al morir se perdieron los fixtures viejos; ahora sirve el
servicio brew `postgresql@17` (:5433) con el snapshot us28 del 2026-08-04
(org org_y4kgfyxn6ggery0uvgfd, users *-1786140680@test.local).
