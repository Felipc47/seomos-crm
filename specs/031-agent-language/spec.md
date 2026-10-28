# Idioma de respuesta del agente

El administrador elige Español, Inglés o Español e inglés en Agente de IA → Comportamiento y guarda usando el control existente. Español es el valor inicial para empresas existentes y nuevas. En modo bilingüe el agente sigue el idioma del cliente (incluidos cambios de idioma y solicitudes explícitas), sin duplicar cada respuesta en ambos idiomas; si no hay contexto usa español. Esta interpretación se muestra en la interfaz.

El idioma rige todos los campos de respuesta al cliente generados por IA y los seguimientos con IA; adapta el saludo y conocimiento sin cambiar hechos. No traduce claves JSON, IDs, citas literales ni nombres de etapas. Prevalece sobre instrucciones heredadas que fijen otro idioma. El borrador del asistente conserva la elección. La API rechaza valores distintos de es/en/es-en y mantiene permisos y aislamiento por empresa. Plantillas de WhatsApp y textos escritos por operadores conservan su contenido.

Aceptación: selector accesible y usable en móvil, persistencia tras recarga, tres modos en turnos reales contra mocks, error de proveedor con handoff sin colgarse, validación negativa y aislamiento. Gate técnico completo antes del deploy. Publicación autorizada por el dueño el 2026-10-12, únicamente este cambio sobre la versión actual de producción.
