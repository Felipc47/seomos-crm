# Research: Asignación y transferencia de chats

## Decisión 1 — Reutilizar el responsable del prospecto

**Decision**: La transferencia actualiza `lead.assigned_member_id`; conversación
y mensajes permanecen intactos.

**Rationale**: Bandeja, Contactos y Pipeline ya leen esa fuente y existe un índice
por organización/responsable. Cambiar solo el prospecto conserva naturalmente
todo el historial y evita estados contradictorios.

**Alternatives considered**:

- Campo `assignee` en conversación: duplicaría la fuente y podría divergir del
  prospecto.
- Crear otra conversación para el destinatario: fragmentaría el historial y
  rompería enlaces, estado de IA y ventana de WhatsApp.

## Decisión 2 — Filtro local compuesto

**Decision**: Bandeja sigue cargando la lista autorizada de la empresa y aplica
“Asignados a mí” junto a filtros existentes en el cliente.

**Rationale**: Es un filtro de productividad, no un permiso. Permite cambio
instantáneo, conserva contadores y converge con los refetch SSE actuales sin
duplicar contratos de listado.

**Alternatives considered**:

- Query separada al servidor: añade estados de carga y complejidad sin reducir
  una frontera de acceso.
- Hacerlo ACL obligatorio: cambia el modelo de permisos que el dueño no pidió.

## Decisión 3 — Destinos y permisos

**Decision**: Todos los roles con acceso actual a Bandeja pueden transferir a
cualquier miembro activo de su propia empresa o dejar el chat sin asignar.

**Rationale**: Todos esos roles pueden atender conversaciones; “otra persona del
equipo” no limita el destino a ejecutivos comerciales. El servidor valida siempre
organización y existencia.

**Alternatives considered**:

- Solo admin: impide la operación diaria y crea cuello de botella.
- Solo comerciales: excluye escalamiento real a admin/editor/marketing aunque ya
  tienen Bandeja.

## Decisión 4 — Contrato dedicado e idempotente

**Decision**: Exponer opciones en una ruta de lectura y transferencia en una ruta
PATCH específica del chat. Repetir el mismo destino devuelve éxito sin alerta.

**Rationale**: Separa la mutación comercial de flags propios de conversación,
reduce cuerpos ambiguos y facilita prueba de tenant, idempotencia e historial.

**Alternatives considered**:

- Ampliar el PATCH general de conversación: mezcla recursos con ciclos de vida
  distintos.
- Reutilizar el PATCH de Pipeline: obliga a la UI a conocer el `leadId` y no cubre
  chats sin prospecto.

## Decisión 5 — Notificación best-effort y SSE organizacional

**Decision**: Persistir primero, publicar el DTO actualizado por SSE y luego crear
una notificación para el nuevo responsable cuando difiera del actor. Un fallo de
notificación no revierte la transferencia.

**Rationale**: La asignación es la verdad primaria. El SSE organizacional ya hace
que cada sesión refresque su lista y la campana refetch solo notificaciones del
usuario autenticado.

**Alternatives considered**:

- Transacción con notificación obligatoria: una alerta secundaria podría bloquear
  el reparto del trabajo.
- Sin notificación: el destinatario podría no advertir el nuevo chat.

## Decisión 6 — Sin auditoría histórica en este alcance

**Decision**: Mostrar estado actual y notificación; no crear tabla de transferencias.

**Rationale**: El pedido exige traspaso con historial conversacional, no historial
de responsables. Evita una migración y mantiene el cambio acotado.

**Alternatives considered**:

- Tabla append-only: útil para analítica futura, pero añade retención, UI y
  consultas fuera del resultado solicitado.
