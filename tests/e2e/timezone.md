# Zona horaria empresarial (039)

Ejecutar contra una base PostgreSQL vacía y aislada `seomos_timezone_039` (:5433), migrada, con `node tests/e2e/timezone-start.mjs`; después `node tests/e2e/timezone.mjs`.

Playwright/Chrome con zona Asia/Tokyo, WhatsApp y LLM simulados. Se crea un fundador y dos empresas ficticias, se cambia zona desde UI, se recarga y se prueba desconexión/reintento. Se comprueban validación, datos ajenos, preservación de metadata, reportes y restricciones de los tres roles no administrativos. Un mensaje real del mock cambia de 09:00 Florida a 08:00 Bogotá; una reunión conserva instante/zona histórica. El formulario real de mailing se prueba con snapshot y respuesta de entrega simulados: 09:00 Florida → 13:00 UTC en julio, hora inexistente DST rechazada. Capturas escritorio/móvil y JSON en `.artifacts/timezone039/`.

No se envían mensajes ni correos reales. No ejecutar este guion en producción.
