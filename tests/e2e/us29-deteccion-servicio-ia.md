# US29 — Detección de servicio por IA en conversaciones directas

**Objetivo**: comprobar que un contacto que escribe primero por WhatsApp queda
clasificado contra el catálogo real y asignado al ejecutivo del servicio, sin
pisar Lead Ads ni transferencias humanas.

## Ejecución

```bash
# Requiere app local en :3000 con wa-mock + ai-mock y PostgreSQL en :5433.
# El guion reinicia la base de datos.
bash tests/e2e/us29-deteccion-servicio-ia.sh
```

## Cobertura

- Mensaje ambiguo permanece sin servicio; un turno posterior con necesidad
  clara clasifica y asigna.
- El servicio y ejecutivo aparecen en API y Bandeja, y el ejecutivo recibe una
  sola notificación aunque lleguen más turnos.
- Un ID de servicio inventado por el modelo se rechaza contra la allowlist.
- Una transferencia manual conserva su responsable cuando la IA completa el
  servicio.
- Una falla de notificación no revierte servicio ni responsable.
- Lead Ads conserva la clasificación determinista por formulario.
