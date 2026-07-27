# 008 — Seguimiento automático de leads (visible en el pipeline)

> Actualización 009: los estados operativos de esta especificación dejaron de
> ser columnas visibles. La rutina conserva `follow_up_due_at` e intentos,
> permanece en `En calificación` y termina en `No convertido`. Ver
> `specs/009-etapas-prospectos/spec.md`.

## Objetivo

Que ningún lead se enfríe en silencio: cuando un cliente pide que lo contacten
más tarde, o cuando nunca responde al primer mensaje del negocio, el sistema
ejecuta una rutina de reintentos automática y **el tablero del pipeline
muestra en qué punto de esa rutina está cada lead**.

## Etapas nuevas (sembradas en toda organización)

| Etapa | `kind` | Quién la alimenta |
|---|---|---|
| Contactar luego | `follow_up` | El agente (acción `follow_up_later`) o el operador arrastrando el lead |
| No contestó | `no_reply` | El sistema, al detectar que el primer mensaje del negocio quedó sin respuesta |
| No interesado | `no_interest` | El sistema, al agotar la rutina sin respuesta (también movible a mano) |

Las tres son ancla del sistema (no eliminables, como `scheduled`), pero sí
renombrables. Si el operador las renombra, la automatización sigue funcionando
porque se localizan por `kind`, no por nombre.

## Rutina de reintentos (idéntica para ambos flujos)

1. **Intento 1** — a las **12 horas** del disparador (o en el momento que el
   cliente pidió, si lo dijo), ajustado a la **ventana de atención**: si cae
   fuera del horario laboral (settings de agenda: `workStartMin`–`workEndMin`,
   zona horaria, lunes a viernes), se corre a la apertura del siguiente
   momento hábil.
2. **Intento 2** — **1 día hábil** después del intento 1, misma hora, con el
   mismo ajuste de ventana.
3. **Cierre** — 1 día hábil después del intento 2 sin respuesta → el lead pasa
   a **No interesado** (con nota `[IA]` explicando el cierre).

Cualquier mensaje entrante del cliente **cancela la rutina** en el punto en
que esté: se limpia el estado de seguimiento y el lead vuelve a
«En conversación» (si la etapa con ese nombre existe; si no, se queda donde
está y el agente decide con `move_stage`).

## Flujo A — «Contactar luego»

- El agente detecta que el cliente pidió ser contactado después
  («escríbeme la otra semana», «ahora no puedo, hablemos mañana»…) → nueva
  acción **`follow_up_later`** con `datetime` opcional (si el cliente dijo
  cuándo) y `reply` opcional (despedida breve).
- Efecto: lead → etapa `follow_up`, `follow_up_due_at` = fecha pedida por el
  cliente (ajustada a ventana) o ahora + 12 h; despedida al cliente.
- Mover el lead a la etapa `follow_up` **a mano** también arma la rutina
  (due = ahora + 12 h ajustado), para que el comercial la use sin el agente.

## Flujo B — «No contestó»

- Candidatos: conversaciones reales **sin ningún mensaje entrante**
  (`last_inbound_at IS NULL`, p. ej. saludo de Meta Lead Ads o primer contacto
  manual/plantilla) cuyo último saliente tiene ≥ 12 h, con el lead en una
  etapa `open` inicial (posición mínima del pipeline, típicamente «Nuevo»).
- Efecto: lead → etapa `no_reply` **y en ese mismo momento se ejecuta el
  intento 1**; luego sigue la rutina normal (intento 2 a +1 día hábil, cierre).

## Qué se envía en cada intento

- **Ventana de WhatsApp (24 h) abierta** → mensaje contextual generado por el
  LLM (retoma la conversación con el tono e instrucciones del agente). Si el
  proveedor falla, texto neutro de respaldo. Solo aplica en el flujo A
  (intento 1), único caso donde puede haber ventana abierta.
- **Ventana cerrada** (flujo B siempre; flujo A intento 2) → **plantilla de
  seguimiento aprobada** configurada en Ajustes del agente
  (`followUp.templateId`). Sin plantilla configurada: el intento se omite con
  nota `[IA]`, la rutina avanza igual y la UI advierte la carencia.

## Guardas (no negociables)

- `is_test` jamás envía (sandbox del Laboratorio).
- Contacto con `opted_out_at` → la rutina se cancela sin enviar.
- Conversación en handoff o con `ai_enabled=false` → la rutina no envía (se
  cancela: un humano ya es dueño de la conversación).
- Perfil del agente apagado (`enabled=false`) u organización con el
  seguimiento desactivado (`followUp.enabled=false`) → no se procesa.
- **Idempotencia**: el intento se «reclama» con un UPDATE atómico sobre
  `follow_up_due_at` antes de enviar — dos barridos concurrentes no duplican
  el mensaje.

## Motor

El barrido corre dentro del cron existente (`/api/cron/sweep`), que ya se
invoca periódicamente en producción. La precisión es la cadencia del cron
(suficiente: los plazos son de horas). En desarrollo, el endpoint acepta
`?now=<ISO>` **solo con los mocks habilitados** (dev-guard) para viajar en el
tiempo en los self-tests.

## Estado en BD

En `lead`: `follow_up_due_at timestamp` (próximo intento; NULL = sin rutina),
`follow_up_attempts integer` (0/1/2). Migración idempotente que además siembra
las tres etapas en las organizaciones existentes (append al final del
tablero, antes se pueden reordenar a gusto).

## Fuera de alcance

- Festivos (hábil = lunes–viernes, como en 004).
- Seguimiento a conversaciones con historial bidireccional que se enfrían
  (solo los dos flujos descritos).
- Métricas/reportes de conversión de seguimiento.
