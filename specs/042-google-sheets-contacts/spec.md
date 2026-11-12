# Sincronización de contactos desde Google Sheets

**Feature Branch**: `codex/google-sheets-contacts`
**Created**: 2026-11-12
**Status**: Implementada y verificada en producción
**Input**: Añadir sincronización periódica de contactos desde Sheets y conectar la hoja de leads de Meta a Lion Data conservando integraciones y funciones existentes.

## User Scenarios & Testing
### US1 — Conectar una pestaña (P1)
El administrador pega el enlace de una pestaña, nombra la conexión y elige cada cuántos minutos revisar los datos.
- Dada una hoja legible con teléfono y nombre, guardar valida el formato y permite sincronizar.
- Una hoja privada/inaccesible o con columnas incompatibles produce un error comprensible sin modificar contactos.
### US2 — Recibir y actualizar contactos (P1)
Una fila válida crea un contacto y oportunidad en la primera etapa; las siguientes revisiones no duplican registros.
- Repetir o reordenar filas conserva el número de contactos y oportunidades.
- Cambios de datos actualizan solamente valores previamente importados sin pisar ediciones manuales.
- Campos vacíos o filas eliminadas nunca borran información del CRM.
- Campaña, empresa, fecha, preguntas y respuestas se conservan en notas identificadas por origen.
### US3 — Controlar y diagnosticar (P2)
El administrador pausa, cambia intervalo o ejecuta una sincronización manual; ve fecha, resultado y cantidades.
- El programador respeta pausa e intervalo; reinicios no pierden conexiones.
- Un fallo de Sheets queda visible y no impide usar las otras integraciones.
- Usuarios sin rol administrador y otras empresas no administran esta conexión.

## Requirements
- FR-001: Conexiones independientes por empresa y pestaña con intervalo de 1 a 1440 minutos; inicial 5.
- FR-002: Lectura unidireccional, sin escribir ni cambiar permisos en la hoja. Admitir enlaces de Sheets accesibles por enlace. No requerir nuevas credenciales ni modificar Calendar.
- FR-003: Reconocer encabezados de exportación Meta (`id`, `full_name`, `phone_number`, `email`) y equivalentes básicos en español; normalizar prefijos `p:+`.
- FR-004: Dedupe por teléfono normalizado dentro de la empresa y registro estable de fila por id externo o teléfono.
- FR-005: Preservar cambios manuales, notas, etapa, responsable, bajas, bloqueos, consentimientos e integraciones. La importación no envía mensajes ni concede consentimiento de marketing.
- FR-006: Filas inválidas se omiten con número y diagnóstico sin revelar datos personales en logs. Cambiar el teléfono de un id ya importado se informa como conflicto.
- FR-007: Concurrencia/reintentos no duplican efectos; trabajo acotado, errores sanitizados, empresas suspendidas excluidas.
- FR-008: Añadir interfaz en Ajustes → Integraciones junto a los formularios existentes.
- FR-009: Conectar ambas pestañas de la hoja indicada a Lion Data y verificar una primera importación y un segundo ciclo sin duplicados.

## Key Entities
Conexión de hoja: empresa, nombre, documento, pestaña, intervalo, pausa, fechas y resultado.
Fila sincronizada: origen estable, contacto vinculado, huella y últimos valores importados.

## Success Criteria
- SC-001: Los nuevos contactos válidos aparecen dentro del intervalo configurado más un minuto del programador.
- SC-002: Repetir una sincronización produce cero contactos duplicados.
- SC-003: Cero borrados o cambios en contactos de otras empresas, credenciales o configuraciones de otras integraciones.
- SC-004: Errores de acceso/formato son visibles sin bloquear la navegación ni otras integraciones.
- SC-005: Lion Data contiene las filas válidas actuales de ambas pestañas con programación activa.

## Assumptions / Edge cases
La hoja indicada permite exportación CSV por su configuración actual (verificado 2026-11-12, HTTP 200). No se cambia ese permiso. Hojas privadas requieren habilitar acceso de lectura por enlace antes de conectar; OAuth privado queda fuera de este alcance. Cada pestaña es una conexión. Se importan registros históricos sin iniciar comunicaciones. Máximo 10000 filas, 64 columnas, 5 MB por pestaña; límites visibles. Filas sin teléfono no se importan porque el CRM exige teléfono. Un contacto eliminado deliberadamente no se recrea por repetir una fila ya vinculada. Campos cambiados manualmente tienen prioridad. Hasta 3000 caracteres de información por fila y 4000 caracteres totales en notas para conservar la edición habitual del CRM. Contactos y pipeline se refrescan mediante eventos aislados por empresa.

## Extensión 043
El flujo optativo por servicio de `../043-sheets-service-flow/spec.md` amplía FR-005: solo las filas nuevas con servicio seleccionado pueden notificar y saludar; el comportamiento de importación sin servicio se conserva.
