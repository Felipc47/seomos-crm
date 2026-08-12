# Feature Specification: Notificaciones y resumen semanal por email

**Feature Branch**: `020-email-notifications`

**Created**: 2026-08-12

**Status**: Approved

**Input**: Notificar por email cada nuevo lead a su responsable y a los administradores, y enviar un resumen semanal individual a cada responsable y un panorama completo a los administradores.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Aviso inmediato de un nuevo lead (Priority: P1)

Como responsable comercial o administrador de una empresa, quiero recibir un aviso por email cuando entra un lead nuevo para poder atenderlo sin depender de tener el CRM abierto.

**Why this priority**: Reduce directamente el tiempo entre la llegada del prospecto y la primera atención humana.

**Independent Test**: Crear un lead nuevo desde cualquiera de los canales admitidos y comprobar que cada administrador recibe un aviso; si el lead ya tiene responsable, esa persona también recibe exactamente un aviso con un enlace al prospecto.

**Acceptance Scenarios**:

1. **Given** una empresa con correo configurado y un responsable asignado, **When** entra un lead nuevo, **Then** el responsable y cada administrador de esa empresa reciben un único email identificando al prospecto y enlazando su ficha.
2. **Given** un lead nuevo todavía sin responsable, **When** entra al CRM, **Then** los administradores reciben el aviso y, al asignarlo después, el responsable recibe su aviso sin repetir el de los administradores.
3. **Given** un evento repetido o dos procesos concurrentes para el mismo lead, **When** se intenta notificar más de una vez, **Then** cada destinatario recibe como máximo un email.
4. **Given** que el correo no está configurado o el proveedor falla, **When** entra el lead, **Then** el lead y sus asignaciones se guardan normalmente y el CRM continúa disponible.

---

### User Story 2 - Resumen semanal por responsable (Priority: P2)

Como responsable comercial, quiero recibir cada semana un resumen de los prospectos que estuvieron a mi cargo para revisar volumen, estado y oportunidades pendientes.

**Why this priority**: Convierte la actividad diaria en una rutina de seguimiento sin obligar al responsable a construir el reporte manualmente.

**Independent Test**: Preparar prospectos asignados a dos responsables durante una semana cerrada, ejecutar el ciclo semanal y comprobar que cada uno recibe únicamente sus métricas y prospectos.

**Acceptance Scenarios**:

1. **Given** una semana cerrada con leads asignados, **When** se ejecuta el ciclo semanal, **Then** cada responsable con actividad recibe un email con el total de sus nuevos prospectos, su distribución por estado y una lista navegable de ellos.
2. **Given** leads de otra empresa o asignados a otra persona, **When** se genera el resumen, **Then** no aparecen en el email del responsable.
3. **Given** que el ciclo semanal se ejecuta varias veces, **When** ya existe una entrega para esa semana y destinatario, **Then** no se envía un duplicado.

---

### User Story 3 - Panorama semanal de administración (Priority: P3)

Como administrador, quiero recibir cada semana el panorama completo de los prospectos de mi empresa para conocer resultados, carga del equipo y leads sin asignar.

**Why this priority**: Da visibilidad ejecutiva sin cruzar información entre empresas ni depender de una sesión abierta.

**Independent Test**: Crear actividad semanal repartida entre responsables, estados y leads sin asignar; ejecutar el ciclo y comprobar que cada administrador recibe el consolidado exclusivo de su empresa.

**Acceptance Scenarios**:

1. **Given** una semana con actividad comercial, **When** se genera el panorama, **Then** cada administrador recibe totales, estados, carga por responsable, no asignados y acceso al CRM.
2. **Given** una semana sin leads nuevos, **When** se genera el panorama, **Then** el administrador recibe un resumen explícito de cero actividad.
3. **Given** varias empresas en una instancia, **When** se generan los panoramas, **Then** cada email contiene exclusivamente datos de su empresa.

### Edge Cases

- Un mismo usuario es administrador y responsable: recibe el panorama administrativo, que ya incluye su actividad, sin un segundo resumen personal redundante.
- Un lead se asigna después de su creación: los administradores son avisados al crearlo y el responsable al quedar asignado.
- Un usuario cambia de correo o deja la empresa antes del resumen: se usa únicamente la membresía y el correo vigentes al generar la entrega.
- Un prospecto no tiene nombre, servicio o responsable: el contenido usa etiquetas neutrales sin romper la entrega.
- El proveedor tarda, rechaza o devuelve contenido inesperado: se registra un fallo sanitizado sin revelar secretos ni bloquear el flujo principal.
- El barrido se ejecuta fuera del lunes o tras un reinicio: toma la última semana calendario completa y conserva una única entrega por destinatario y período.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST considerar nuevo lead cualquier alta real en el pipeline, independientemente de si proviene de WhatsApp, Meta Ads, alta manual o importación.
- **FR-002**: Al crear un lead, el sistema MUST enviar un aviso a todos los administradores vigentes de su empresa.
- **FR-003**: El sistema MUST enviar el aviso al responsable vigente cuando el lead nace asignado o cuando recibe su primera asignación posterior.
- **FR-004**: Cada aviso MUST identificar al prospecto, indicar su contexto disponible y ofrecer un enlace autenticado al CRM.
- **FR-005**: El sistema MUST deduplicar cada aviso por lead y destinatario, incluso ante reintentos o concurrencia.
- **FR-006**: El sistema MUST generar resúmenes sobre la última semana calendario completa según la zona horaria de la empresa.
- **FR-007**: Cada responsable con actividad MUST recibir solo el total, estados y detalle de los prospectos asignados a él durante el período.
- **FR-008**: Cada administrador MUST recibir el panorama completo de su empresa, incluidos totales, estados, distribución por responsable y no asignados; también MUST recibir un resumen de cero actividad.
- **FR-009**: Un administrador que también sea responsable MUST recibir solo el panorama completo, sin resumen personal redundante.
- **FR-010**: Cada resumen semanal MUST ser idempotente por empresa, destinatario, rol de resumen y período.
- **FR-011**: Toda consulta y entrega MUST preservar el aislamiento de empresas y nunca mezclar destinatarios o prospectos de organizaciones distintas.
- **FR-012**: La clave del proveedor MUST permanecer únicamente en configuración segura del servidor y nunca aparecer en cliente, respuesta, contenido del correo ni logs.
- **FR-013**: Sin configuración de correo o ante fallo del proveedor, el sistema MUST conservar el lead, la asignación y las notificaciones internas y MUST terminar sin colgarse.
- **FR-014**: El sistema MUST limitar el detalle de cada resumen para mantener el email legible, conservando los totales exactos y un enlace al CRM cuando haya más elementos.

### Key Entities

- **Entrega de correo**: Registro idempotente de un intento, asociado a una empresa, un destinatario, un tipo de comunicación y opcionalmente un lead o período semanal; conserva estado y error sanitizado.
- **Período semanal**: Intervalo de siete días calendario ya cerrado en la zona horaria de la empresa.
- **Resumen de responsable**: Agregación de los leads nuevos del período que permanecen asignados al miembro destinatario.
- **Panorama administrativo**: Agregación completa de los leads nuevos del período para una empresa.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En una prueba de extremo a extremo, el 100% de los destinatarios elegibles recibe exactamente un aviso por lead y ningún usuario ajeno lo recibe.
- **SC-002**: La creación o asignación de un lead termina correctamente en el 100% de las pruebas aun cuando el canal de correo esté ausente o falle.
- **SC-003**: Cada resumen semanal probado contiene totales exactos y cero prospectos de otra persona o empresa.
- **SC-004**: Ejecutar el ciclo semanal tres veces para el mismo período produce una sola entrega por destinatario y tipo de resumen.
- **SC-005**: Ningún secreto ni respuesta cruda del proveedor aparece en respuestas del producto, contenido de emails o logs de las pruebas.

## Assumptions

- “Administrador” significa un miembro vigente con rol de administrador dentro de la empresa; no implica enviar datos de todas las empresas al superadministrador de la instancia.
- La última semana completa va de lunes inclusive a lunes exclusivo en la zona horaria configurada para la empresa.
- Los responsables sin leads nuevos asignados durante el período no reciben un email vacío; los administradores sí reciben el panorama de cero actividad.
- Los resúmenes muestran como máximo 20 prospectos en detalle y conservan totales exactos.
- La integración de correo transaccional opcional fue aprobada mediante la enmienda constitucional 1.4.0.

## Out of Scope

- Campañas de marketing por email, newsletters, gestión de contactos en el proveedor y recepción de correo.
- Preferencias individuales de frecuencia, plantillas editables y analítica de aperturas o clics.
- Reenvío histórico de avisos para leads creados antes de habilitar la configuración.
