# Plan

1. Resolver confirmaciones cortas solo contra opciones concretas del último mensaje saliente, verificando fecha y hora completas con zona empresarial. Conservar la evidencia textual existente para propuestas explícitas del cliente.
2. Indicar al modelo que una selección inequívoca basta y que no debe pedir doble confirmación. Localizar los textos de respaldo y éxito de schedule_meeting.
3. Regresiones unitarias de contexto/ambigüedad/idioma y E2E por canal con mocks más UI de la reunión, sin tocar datos reales.

Constitución: sin nuevos servicios/secretos/tablas; se preservan consultas y guardas de tenant, sandbox, disponibilidad e idempotencia existentes. Cambios previos en el árbol de trabajo se conservan.
