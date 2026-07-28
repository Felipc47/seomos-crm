# Tasks: IA reactiva desde el chat

**Input**: Documentos en `specs/012-ia-reactiva-chat/`

## Phase 1: Setup

- [x] T001 Preparar self-test de activación, duplicado, ventana y fallo en
  `tests/e2e/us25-ia-reactiva-chat.md` y `.sh`

## Phase 2: Dominio y API

- [x] T002 Permitir programación inmediata y coalescida en el pipeline
- [x] T003 Crear la decisión multi-tenant de turno pendiente con estados
  explícitos y pruebas unitarias
- [x] T004 Ampliar PATCH de conversación para encolar después de reactivar
- [x] T005 Exponer disponibilidad mínima del agente sin datos sensibles

## Phase 3: Interfaz compartida

- [x] T006 Crear control accesible, responsive y reutilizable de IA
- [x] T007 Integrarlo en el encabezado de Bandeja con estado busy y feedback
- [x] T008 Reutilizar la misma semántica en Ver detalles

## Phase 4: Verificación

- [x] T009 Verificar reactivación inmediata y una sola respuesta
- [x] T010 Verificar chat atendido, sin mensajes, ventana cerrada y proveedor
- [x] T011 Verificar coherencia SSE, recarga, teclado y 375/768/1440
- [x] T012 Ejecutar typecheck, lint, build, tests y regresión del agente

## Dependencies & Execution Order

T001 precede implementación. T002-T003 preceden T004. T005-T006 preceden
T007-T008. T009-T012 verifican la entrega.
