# Research: Restablecimiento seguro de contraseñas

## Decisión 1 — Tokens nativos de Better Auth

**Decision**: Usar `request-password-reset` y `reset-password` de Better Auth 1.6.23, con expiración de 3600 segundos y revocación de todas las sesiones al completar.

**Rationale**: La versión instalada ya crea tokens aleatorios, los guarda en `verification`, valida vencimiento y los consume atómicamente antes de actualizar el hash. Evita implementar criptografía o almacenamiento paralelo.

**Alternatives considered**: Tabla y tokens propios (duplica una función sensible); contraseña temporal definida por el admin (revela un secreto y no ayuda al admin bloqueado); preguntas de seguridad (débiles y fuera del modelo actual).

## Decisión 2 — Una misma entrega con dos semánticas de error

**Decision**: El callback de Better Auth siempre intenta la misma entrega. En solicitudes públicas absorbe el fallo para conservar una respuesta idéntica entre correos existentes e inexistentes; cuando lo invoca el endpoint admin dentro de un contexto interno, propaga un error sanitizado y el endpoint responde indisponibilidad.

**Rationale**: Un HTTP distinto en la ruta pública permitiría enumerar cuentas cuando Resend falla solo para usuarios existentes. El admin ya autenticado conoce el miembro y necesita saber si debe reintentar.

**Alternatives considered**: Propagar siempre el fallo (filtra existencia); ocultarlo siempre (mensaje falso al admin); endpoint de tokens propio (superficie sensible innecesaria).

## Decisión 3 — Reutilizar Resend sin historial de dominio

**Decision**: Enviar mediante `src/lib/resend/client.ts` con una clave idempotente `password-reset/<sha256(token)>`, sin persistir el correo ni el token en `email_delivery`.

**Rationale**: `verification` ya es la fuente de verdad del proceso. Un hash irreversible permite deduplicar reintentos del mismo callback sin colocar el token o el correo en headers, logs o tablas de dominio.

**Alternatives considered**: Token crudo en la clave (exposición innecesaria); nueva tabla tenant (duplica estado y complica recuperación pública); sin idempotencia (posibles correos repetidos ante reintentos).

## Decisión 4 — Autorización admin antes de resolver correo

**Decision**: `POST /api/settings/team/{memberId}/password-reset` exige owner, busca simultáneamente membresía y usuario dentro del `organization_id` activo y solo entonces llama a Better Auth.

**Rationale**: La pertenencia al tenant es la frontera de autorización; el identificador de miembro no basta y un superadmin tampoco debe saltarse el tenant activo desde esta ruta.

**Alternatives considered**: Recibir email del cliente (manipulable); buscar miembro globalmente (cruce de tenant); exponer el token al admin (rompe secreto del titular).

## Decisión 5 — UI pública explícita y validación doble

**Decision**: Añadir `/forgot-password` y `/reset-password`, confirmación de contraseña, mensajes neutros y estados claros para token inválido/usado. El login enlaza la recuperación y la lista de equipo ofrece la acción por persona.

**Rationale**: Hace descubrible el flujo y reduce errores de digitación, sin pedir una sesión en el navegador que abre el correo.

**Alternatives considered**: Modal en login (peor manejo del enlace y estados); página única con ambos pasos (mezcla tokens con solicitud); cambio solo desde perfil (no resuelve olvido).
