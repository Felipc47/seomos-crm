# 040 — Confirmación contextual e idioma de reuniones

Entorno local aislado: PostgreSQL en 127.0.0.1:5433, BD nueva `seomos_scheduling_context_040` con todas las migraciones. Usar solo esta BD de pruebas. El starter configura WhatsApp/LLM/Google contra los mocks internos y credenciales ficticias; requiere Chrome instalado y dependencias del proyecto.

1. Crear la BD y aplicar `DATABASE_URL=postgresql://postgres@127.0.0.1:5433/seomos_scheduling_context_040 pnpm db:migrate`.
2. Ejecutar `node tests/e2e/scheduling-context-start.mjs`.
3. Ejecutar `node tests/e2e/scheduling-context.mjs`.

El guion registra el admin de pruebas mediante Playwright y usa el webhook de WhatsApp simulado para conducir la conversación. Verifica textos entregados en el outbox, fecha exacta de la reunión y detalles visibles en la bandeja. Configura la empresa en America/New_York y el navegador en Asia/Tokyo para detectar conversiones incorrectas. El mock devuelve JSON envuelto en Markdown para ejercer también su extracción robusta.

Casos: «Friday» elige la única opción del viernes; secuencia completa de la captura «Friday» → pregunta concreta → «Yes»; confirmación repetida; jueves con varias horas y «Yes» a varias opciones; rechazo, «?», datetime incorrecto y pregunta ajena; hora histórica; español y modo bilingüe; correo ausente, fecha inválida, antelación y jornada; Google conectado y conflicto real; salida de proveedor persistentemente inválida con handoff sin reserva.

Artefactos: `.artifacts/scheduling-context/e2e.json` y `confirmed-desktop.png`. Los números y correos son ficticios. La publicación en producción se verifica por separado.
