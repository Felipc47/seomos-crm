# Feature Specification: Chat de ayuda del CRM

**Feature Branch**: `codex/029-chat-ayuda`
**Created**: 2026-10-09
**Status**: Implementado y verificado localmente; pendiente de publicación en producción
**Input**: Chat emergente de preguntas y respuestas que enseñe a utilizar la herramienta.

## User Scenarios & Testing

### US1 — Resolver una duda sin salir del trabajo (P1)
Como usuario autenticado quiero abrir Ayuda, preguntar en español y recibir una explicación corta, pasos y un enlace a la sección pertinente.
**Prueba independiente**: abrir el chat desde Bandeja, preguntar cómo responder y navegar por el enlace.
1. Desde cualquier sección autenticada, Ayuda abre un panel con preguntas sugeridas de esa pantalla.
2. Una pregunta recibe una respuesta basada en las funciones existentes y pasos concretos.
3. Cerrar y reabrir conserva la conversación durante la sesión; Nueva conversación la vacía.
4. En móvil el panel cabe en la pantalla y permite escribir y cerrar; Escape devuelve el foco al botón.

### US2 — Recibir ayuda acorde al acceso (P1)
Como miembro de equipo quiero orientación para las funciones que tengo disponibles.
**Prueba independiente**: consultar como comercial, editor y admin de otra empresa.
1. El servidor obtiene rol y empresa de la sesión, sin confiar en valores enviados por el cliente.
2. Nunca ofrece enlaces de administración a roles sin acceso ni Mailing si está deshabilitado.
3. No consulta conversaciones, contactos, secretos ni configuración comercial, ni ejecuta cambios.

### US3 — Seguir recibiendo orientación ante fallos (P2)
Como usuario quiero poder continuar si no hay IA, la respuesta es inválida o se pierde la conexión.
**Prueba independiente**: forzar fallo del proveedor y fallo de red.
1. Sin proveedor o tras reintentos fallidos se presenta una guía local pertinente y se identifica ese modo.
2. Sin red se conserva la pregunta, se libera el estado de carga y se permite reintentar.
3. Si la documentación no cubre la pregunta, pide aclaración sin afirmar capacidades inventadas.

### Edge Cases
Pregunta vacía o demasiado larga; historial manipulado; rutas y enlaces inventados; consultas fuera del CRM; permisos insuficientes; móvil pequeño; múltiples envíos; cambio de pantalla; proveedor lento; cierre mientras responde.

## Requirements
- **FR-001**: Botón Ayuda y chat accesibles en todas las pantallas autenticadas.
- **FR-002**: Preguntas sugeridas por pantalla, texto libre y continuidad de hasta seis mensajes de contexto.
- **FR-003**: Respuestas en español basadas en guías versionadas de funciones reales; pasos y enlaces internos autorizados.
- **FR-004**: Acceso autenticado y selección de guías conforme al rol, superadmin y habilitación de Mailing.
- **FR-005**: No ejecutar acciones ni leer registros de clientes; conversación solo en memoria del navegador y durante el turno del servidor.
- **FR-006**: Degradación a guías locales ante falta/fallo de IA; recuperación de errores de red y espera acotada.
- **FR-007**: Inputs acotados, validación de salida y enlaces por catálogo; límite por usuario/empresa antes de llamar al proveedor.
- **FR-008**: Abrir, cerrar, teclado, iniciar otra conversación y navegar funcionan en escritorio y móvil.

## Key Entities
Guía versionada (título, resumen, palabras clave, pasos, ruta, permisos); mensaje temporal (autor, contenido); respuesta (explicación, guías, modo).

## Assumptions
Ayuda interna para usuarios del CRM; no es el agente que responde a clientes por WhatsApp. Primera versión en español. Reutiliza el proveedor de IA existente sin nuevas credenciales ni descuento del saldo comercial de IA (patrón del asistente 027); las llamadas reales sí tienen coste en el proveedor. La publicación en producción queda fuera de esta implementación local.

## Success Criteria
- **SC-001**: E2E prueba pregunta libre, respuesta con pasos, enlace y continuidad desde dos pantallas.
- **SC-002**: E2E demuestra restricciones por rol/empresa y 401 sin sesión.
- **SC-003**: Fallo del proveedor y respuesta inválida terminan en guía útil; fallo de red permite reintentar sin perder la pregunta.
- **SC-004**: Panel sin desbordamiento a 390×844 y 1440×1000; teclado y foco verificados.
- **SC-005**: Typecheck, lint, build y tests verdes, con evidencia local guardada.
