# Plan

1. Crear registro de fuentes SMS por organización, tipo y clave, con evidencia y migración aditiva.
2. Exponer configuración solo a administradores y restringir cada clave a fuentes de la propia empresa.
3. Inscribir idempotentemente por teléfono US al recibir un lead Meta o importar una fila Sheets por primera vez. Conservar bajas por conflicto único.
4. Cruzar bloqueo, archivo y baja del contacto CRM antes de inscribir y antes de enviar SMS.
5. Verificar UI, Meta/Sheets/WhatsApp/Brevo mocks, duplicados, bajas, aislamiento, errores y gate técnico.
6. Publicar la versión probada, registrar fuentes de Lion Data con la evidencia del formulario y verificar la ingesta real sin mandar SMS de prueba no autorizado.
