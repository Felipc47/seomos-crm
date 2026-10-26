# Plan

1. Contrato puro compartido de misiones y espera; Zod en perfil y borrador.
2. Cinco campos en agent_profile y migración aditiva generada por Drizzle;
   defaults legacy/off/3. Toda lectura/escritura nueva tenant-scoped.
3. UI de Misión principal y control Esperar antes de proponer una cita en el
   comportamiento del agente; preservar los datos hasta Guardar comportamiento.
4. Contador real de mensajes del bot de toda la conversación; contexto en prompt
   y control determinista de acciones/textos. Aplicar también a seguimientos.
5. Demo usa su historial temporal y la misma política; asistente de configuración
   aplica la misión elegida solo al borrador.
6. Unitarios de contrato/guardas/prompt y E2E con WA/IA mocks; gate completo.
   Preparar publicación aislada con migrador al boot y verificación de UI real.

No hay nuevas credenciales ni proveedores. La opción ecommerce comparte el
link configurado y conocimiento; no añade llamadas a APIs de tiendas.
