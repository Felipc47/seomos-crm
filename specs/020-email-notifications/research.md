# Research: Notificaciones y resumen semanal por email

## Decisión 1 — Integración HTTP mínima con Resend

**Decision**: Usar `POST /emails` con `Authorization: Bearer`, cuerpo JSON e `Idempotency-Key`, mediante `fetch` nativo y un adaptador dedicado.

**Rationale**: Evita una dependencia SDK innecesaria, permite redirigir la base URL al mock E2E y sigue el contrato oficial. Resend admite claves idempotentes de hasta 256 caracteres durante 24 horas: <https://resend.com/docs/api-reference/emails/send-email>.

**Alternatives considered**: SDK oficial (más superficie sin beneficio para un único endpoint); SMTP (menos cómodo para mock y respuesta estructurada); otro proveedor (prohibido por la constitución 1.4.0).

## Decisión 2 — Idempotencia local duradera

**Decision**: Persistir una fila única antes de cada envío con una clave determinista por tipo, destinatario y lead/período; enviar solo si el INSERT gana.

**Rationale**: La protección del proveedor expira a las 24 horas y no cubre reintentos semanas después. PostgreSQL da exclusión concurrente y auditoría mínima sin cola externa.

**Alternatives considered**: Depender solo de Resend (ventana insuficiente); deduplicar en memoria (se pierde al reiniciar); cola externa (prohibida por soberanía y arquitectura).

## Decisión 3 — Semana calendario completa por empresa

**Decision**: Calcular lunes inclusivo a lunes exclusivo usando la zona horaria vigente de la empresa. Cada ejecución del cron intenta la última semana completa y la tabla de entregas impide duplicados.

**Rationale**: Funciona aunque el cron se retrase o el contenedor reinicie y coincide con el calendario operativo, sin depender del huso horario del servidor.

**Alternatives considered**: Últimos siete días móviles (cambia entre ejecuciones); ejecutar solo los lunes (pierde el resumen si el cron falla ese día); UTC fijo (corta días locales).

## Decisión 4 — Destinatarios vigentes y sin redundancia

**Decision**: Aviso inmediato a owners de la organización y al responsable vigente; resumen personal solo a responsables con actividad que no sean owners; panorama completo a todos los owners.

**Rationale**: Respeta la palabra “admin” dentro de cada tenant, evita dos resúmenes al administrador-responsable y no entrega panoramas ajenos al superadmin por su condición global.

**Alternatives considered**: Incluir superadmins globales (riesgo de sobreexposición); enviar resumen vacío a todo el equipo (ruido); dos resúmenes al owner-responsable (redundancia).

## Decisión 5 — Dominio de envío verificado

**Decision**: Exigir `RESEND_FROM_EMAIL` junto con la API key para habilitar correo y recomendar un subdominio verificado.

**Rationale**: Resend requiere verificar un dominio propio para enviar a destinatarios reales y recomienda subdominios para aislar reputación: <https://resend.com/docs/dashboard/domains/introduction>.

**Alternatives considered**: Dirección de prueba compartida (solo sirve para desarrollo); valor embebido (incompatible con múltiples despliegues).
