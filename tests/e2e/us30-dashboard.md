# US30 — Dashboard de analítica comercial

## Objetivo

Comprobar que el Dashboard calcula estadísticas reales por empresa y rango,
que el filtro persiste en la URL y que la presentación funciona en navegador.

## Ejecución

```bash
BASE_URL=http://localhost:3000 bash tests/e2e/us30-dashboard.sh
```

## Cobertura

- 10 leads en 7 días y 14 en 30 días, con conteos exactos de etapas,
  oportunidades, clientes, conversión, reuniones y sin asignar.
- Tendencia diaria completa, servicios y responsables.
- Personalizado inclusivo y recarga que conserva la selección.
- Rango inválido 422, sesión ausente 401 y Editor de agente 403.
- Segunda empresa con cero datos: aislamiento tenant-safe.
- Dashboard primero y activo en el menú; Editor redirigido a Bandeja.
- 375, 768 y 1440 px, modo oscuro y consola limpia.
