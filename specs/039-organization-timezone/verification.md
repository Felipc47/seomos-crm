# Verificación — 2026-11-06

- Base: producción `9dcbadeee4434e47275dff8b21876714bd87acc4`, checkout aislado en SSD. No se incorporaron cambios del workspace original.
- Playwright/Chrome: **42/42 comprobaciones**, navegador Asia/Tokyo, mocks WhatsApp/LLM, BD ficticia separada. Incluye admin normal de empresas independientes; comercial, marketing y editor no pueden editar.
- UI: selector global, Bogotá inicial, guardado/recarga, error de red con reintento, tercera zona libre, escritorio y móvil sin desborde horizontal.
- Hora observable: mensaje mock 13:00 UTC de julio se muestra a 09:00 Florida / 08:00 Bogotá. Reportes consultan misma zona. Reunión existente conserva instante y zona registrada.
- Mailing: formulario real con snapshot/entrega simulados, 09:00 Florida → 13:00 UTC; rechaza 02:30 inexistente por inicio de horario de verano, sin error de navegador ni pérdida del formulario.
- Operación administrativa de presets probada en BD ficticia: actualización exacta y rollback completo si alguna empresa no existe; preserva el calendario.
- Unidades: **582/582**, con validación IANA, agrupación por fecha local y offsets de invierno/verano. Gate final completo: typecheck, lint, build y unidades correctos.
- Evidencia: `.artifacts/timezone039/checks.json`, `desktop.png`, `mobile.png`; logs locales `/private/tmp/seomos-timezone039-{gate,e2e}.log`.
- No se enviaron mensajes ni emails reales.
