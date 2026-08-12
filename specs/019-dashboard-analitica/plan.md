# Plan 019 — Dashboard de analítica comercial

## Arquitectura

- `src/server/dashboard/range.ts`: contrato puro de presets, fechas válidas,
  aritmética de días y límite de 366 días.
- `src/server/dashboard/metrics.ts`: agregaciones PostgreSQL multi-tenant. Los
  timestamps se convierten desde la zona de sesión de PostgreSQL a la zona del
  negocio antes de extraer su fecha local.
- `GET /api/dashboard`: autenticación, permiso comercial, resolución del rango
  y serialización de un único DTO.
- `DashboardClient`: estado en URL, presets, formulario personalizado,
  tarjetas, gráfico SVG sin dependencia adicional y listas de distribución.
- `AppNav`: Dashboard primero en escritorio y navegación móvil desplazable.

## Rendimiento

- Consultas agregadas, sin cargar contactos ni mensajes completos.
- Límite de 366 puntos diarios y seis elementos en cada distribución.
- Todas las condiciones incluyen `organization_id`; los índices existentes de
  lead, conversación, etapa y servicio se reutilizan.

## Decisiones

- El embudo usa la etapa **actual** de los leads nacidos en el periodo: es una
  cohorte, no un historial de movimientos inexistente.
- Reuniones usa `conversation.meeting_scheduled_for` y excluye conversaciones
  del Laboratorio.
- No se incorpora Recharts u otra librería: barras y línea se renderizan con
  CSS/SVG para mantener el runtime soberano y liviano.
- La API devuelve etapas con cero y categorías explícitas para datos faltantes.

## Verificación

- Unitarias: presets, cambio de mes/año, bisiesto, fechas inválidas, rango
  invertido y máximo.
- E2E US30: fixture exacto en dos organizaciones; 7/30/personalizado, embudo,
  reuniones, conversiones, aislamiento, 401/403, navegación, dark y responsive.
- Gate: `pnpm typecheck && pnpm lint && pnpm build && pnpm test`.

### Resultado

- US30: 35 verificaciones de comportamiento aprobadas.
- Regresión US23 (Pipeline y Contactos): 30 verificaciones aprobadas.
- Gate: build de producción correcto; 40 archivos y 263 pruebas unitarias
  aprobadas.
- QA visual en navegador: claro, oscuro y 375/768/1440 px sin overflow ni
  errores de consola.
