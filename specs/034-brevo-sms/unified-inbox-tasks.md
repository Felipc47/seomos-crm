# Tareas — Bandeja unificada

- [x] Snapshot SMS con resumen por contacto y contrato de tipos.
- [x] Lista única con filtro y pills de canal; navegación `/sms` compatible.
- [x] Hilo SMS embebido, alta, consentimiento, revisión, envío y baja.
- [x] Typecheck, lint, build, unitarios y E2E happy/unhappy path.
- [x] Verificación visual móvil/escritorio con datos ficticios.
- [ ] Publicación y comprobación en producción sin cambios ajenos.

## Verificación local

- TypeScript, ESLint y Next build: correctos.
- Vitest: 70 archivos y 630 pruebas correctas.
- `node tests/e2e/sms-two-way.mjs`: 51 comprobaciones correctas con mocks; incluye mezcla de canales, filtro, búsqueda, envío/respuesta SMS, móvil, roles, aislamiento y saldo cero.
- Capturas revisadas en `.artifacts/sms-two-way/`.
