# Tareas — agente SMS

- [x] Migración aditiva y tipos SMS.
- [x] Control IA y API por contacto.
- [x] Turno automático seguro, idempotente y limitado a un segmento.
- [x] E2E con mocks, camino infeliz y gate técnico.
- [x] Verificación visual móvil y escritorio con datos ficticios.
- [ ] Publicación y comprobación en producción sin gasto real.

## Verificación local

- TypeScript, ESLint y build Next: correctos.
- Vitest: 70 archivos y 630 pruebas correctas.
- E2E del agente: 22 comprobaciones correctas, sin proveedor real.
- Regresión SMS manual y Bandeja: 51 comprobaciones correctas.
- Capturas revisadas en `.artifacts/sms-agent/`.
