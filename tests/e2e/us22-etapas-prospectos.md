# US22 — Etapas claras y cierres trazables (009)

## Objetivo

Validar el embudo canónico de siete etapas y que las dos salidas negativas
exijan un motivo compatible, sin dejar datos de cierre al reabrir el lead.

## Cómo correrlo

Con Postgres local en `:5433` y el servidor en `http://localhost:3000` usando
los mocks internos:

```bash
bash tests/e2e/us22-etapas-prospectos.sh
bash tests/e2e/us22-migracion-etapas.sh
```

## Qué verifica

- Una organización nueva recibe, en orden: Nuevo, En calificación, Calificado,
  Cita agendada, Cliente, No calificado y No convertido.
- No existen las columnas operativas antiguas del seguimiento.
- `No calificado` sin motivo o con un motivo de `No convertido` responde 422.
- Un cierre válido persiste motivo y fecha.
- Reabrir en `En calificación` limpia ambos campos.
- `No convertido` acepta su propio catálogo de motivos.
- La consolidación de datos antiguos conserva leads, seguimientos y etapas
  personalizadas, y puede reejecutarse sin duplicar ni desordenar.
