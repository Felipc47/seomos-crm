# 008 — Plan de implementación

## Piezas

1. **Schema/migración** (`0014`): kinds `follow_up`/`no_reply`/`no_interest`
   en `pipeline_stage`; `follow_up_due_at` + `follow_up_attempts` en `lead`;
   siembra idempotente de las 3 etapas en orgs existentes; `SEED_STAGES`
   actualizado en `on-signup.ts`.

2. **Settings** (`org-settings.ts`): bloque `followUp` en
   `organization.metadata` — `{ enabled: boolean (default true),
   templateId: string | null }` — con get/save y endpoint API. UI: sección
   «Seguimiento» en la página del Agente (toggle + selector de plantilla
   aprobada + advertencia si falta plantilla).

3. **Motor** (`src/server/ai/follow-up.ts`):
   - `nextAttentionSlot(date, calSettings)`: corre una fecha a la ventana de
     atención (día hábil + [workStartMin, workEndMin]) usando
     `lib/business-days.ts`.
   - `armFollowUp(lead, due)`: etapa por kind + due ajustado.
   - `cancelFollowUp(contactId)` (entrada de ingest): limpia estado y devuelve
     el lead a «En conversación» (por nombre; fallback: se queda).
   - `sweepFollowUps(now)`: (a) leads con `follow_up_due_at <= now` → claim
     atómico (UPDATE … WHERE follow_up_due_at = X RETURNING) → enviar intento
     (LLM si ventana 24h abierta, plantilla si no; sin plantilla → nota y
     avanzar) → programar siguiente paso o cerrar en `no_interest`;
     (b) detectar candidatos «no contestó» (conversación real sin entrantes,
     último saliente ≥ 12h, lead en primera etapa `open`, sin rutina activa)
     → mover a `no_reply` + ejecutar intento 1.
   - Guardas: is_test, opt-out, handoff, aiEnabled, perfil apagado,
     followUp.enabled.

4. **Agente**: acción `follow_up_later {datetime?, reply?}` en `actions.ts`,
   oferta + reglas en `prompts.ts`, ejecución en `pipeline.ts` (mover a
   `follow_up`, armar due, enviar despedida). Mover a mano un lead a la etapa
   `follow_up` (API del tablero) también arma la rutina; sacarlo de las etapas
   de seguimiento la desarma.

5. **Cron**: `sweepFollowUps` se invoca desde `/api/cron/sweep` junto al
   barrido existente. Override `?now=` solo con dev-guard (mocks) para
   self-tests con viaje en el tiempo.

6. **UI tablero**: colores para los kinds nuevos en `stage-colors.ts`; reglas
   de anclas (no eliminables) donde el CRUD las imponga.

## Decisiones (defaults tomados)

- «No interesado» es una etapa nueva (kind `no_interest`), separada de
  «Perdido»: el dueño la nombró explícitamente como terminal de la rutina.
- Cierre a `no_interest` ocurre 1 día hábil después del intento 2.
- La respuesta del cliente cancela la rutina y lo regresa a «En conversación».
- Fuera de la ventana de 24h solo se envía la plantilla configurada; sin
  plantilla el intento se omite (con nota) pero la rutina avanza — la UI
  advierte para que el dueño configure la plantilla.
