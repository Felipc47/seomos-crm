# US29 — Detección de servicio por IA y asignación al derivar

**Objetivo**: comprobar que un contacto que escribe primero por WhatsApp queda
clasificado contra el catálogo real, y que el comercial del servicio se marca
ÚNICAMENTE cuando la conversación se deriva a atención humana — nunca antes —
sin pisar transferencias humanas.

## Ejecución

```bash
# Requiere app local en :3000 con wa-mock + ai-mock y PostgreSQL en :5433.
# El guion reinicia la base de datos.
bash tests/e2e/us29-deteccion-servicio-ia.sh
```

## Cobertura

- Mensaje ambiguo permanece sin servicio; un turno posterior con necesidad
  clara clasifica el servicio pero NO asigna comercial mientras atiende la IA.
- Al pedir un asesor (handoff), el lead queda asignado al comercial del
  servicio y este recibe UNA sola notificación aunque lleguen más turnos.
- Orden inverso: si la derivación llega antes que la clasificación, la
  clasificación tardía completa la asignación pendiente.
- Un ID de servicio inventado por el modelo se rechaza contra la allowlist.
- Una transferencia manual conserva su responsable cuando la IA completa el
  servicio.
- Una falla de notificación durante la derivación no revierte servicio ni
  responsable.
- Lead Ads clasifica el servicio por formulario pero tampoco asigna comercial
  hasta la derivación.
- Retroactividad (migración 0021): libera asignaciones automáticas prematuras
  sin derivación y asigna las conversaciones ya derivadas que quedaron sin
  responsable.
