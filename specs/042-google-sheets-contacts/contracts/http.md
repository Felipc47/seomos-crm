# Contratos
GET /api/settings/sheets → {sources}; POST → configuración validada y probada en origen; PATCH /api/settings/sheets/:id → nombre/interval/enabled; POST /:id/sync → resumen o diagnóstico. Sesión + admin + tenant obligatorios, 404 para id ajeno.
POST /api/cron/sheets requiere Bearer AGENT_SWEEP_SECRET y devuelve cantidades agregadas sin datos de contactos. En producción ignora viaje temporal. Un fallo por fuente no cancela las demás.
