# Verificación 038 — 2026-10-30

Base: b9cb7f81e3122feba3b649182c3cf11f705323a8, la versión productiva al iniciar.
Checkout aislado; se conservaron los cambios previos del workspace original.

- Typecheck, lint y build aprobados. 65 archivos / 575 pruebas unitarias verdes.
- Playwright + mocks WhatsApp/IA en localhost:3110 y PostgreSQL exclusivo
  seomos_shared_contacts_038: 21/21 comprobaciones en la corrida final.
- Webhook→JSONB→DTO→SSE→hilo abierto, varios contactos/números, correo, empresa,
  dirección, web, persistencia y recarga comprobados.
- Datos inválidos y URLs inseguras degradan; mensaje siguiente funciona.
- Históricos sin datos tienen explicación; no se inventa ni reconstruye información.
- Autenticación y aislamiento de empresa comprobados; webhook repetido no duplica;
  migración repetida preserva datos; no se crean prospectos para las personas
  compartidas. Con la IA apagada no hubo envíos al recibir las fichas.
- Desktop y móvil 390px inspeccionados visualmente; sin overflow ni errores JS.
- Evidencia sintética gitignored: .artifacts/shared-contacts/{checks.json,desktop.png,mobile.png}.

La columna shared_contacts es nullable y la migración 0036 aditiva con IF NOT
EXISTS. La imagen anterior puede seguir operando con la columna extra.
Producción verificada: deployment j0wok3mhxuvcpbre2tnvii7w finalizado el
2026-10-30 a las 15:40:18 Bogotá. Commit eb1d9a6, running:healthy, cero
reinicios, migración aplicada y Ready en 2.1 s. HTTP health 200; historial
anónimo 401 y mocks WhatsApp/IA 404. UI autenticada de la conversación de
la captura muestra el nuevo fallback de datos históricos, sin perder mensajes
ni controles. No se enviaron mensajes a clientes durante la verificación.
Las tarjetas con datos completos se verificaron en el E2E aislado; no se inyectaron
fichas ficticias en producción. Captura real gitignored en el workspace original:
.artifacts/shared-contacts/production.jpg.
