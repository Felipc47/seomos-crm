# Cobertura funcional de la integración local

El diseño se aplica a las pantallas reales. No hay reemplazos de componentes por versiones simplificadas. Se conservaron handlers, llamadas API, condiciones de permisos, validaciones y atributos `data-help` usados por las guías.

| Área | Superficies conservadas |
| --- | --- |
| Agente | Activación global, proveedor, créditos, identidad, saludo, siete tonos (máximo dos), matices, seis secciones de entrenamiento, escalado humano y texto heredado |
| Asistente de configuración | Sitio/negocio, cinco objetivos, límites, generación, revisión, editar respuestas y aplicar borrador sin guardar automáticamente |
| Conocimiento | P/R, bloques, contador de contexto, creación y eliminación |
| Seguimiento y agenda | Activación, plantilla aprobada, avisos de disponibilidad; Calendar, jornada, duración de franjas, antelación y guardado |
| Bandeja | Filtros, búsqueda, selección, anclar/archivar, transferir, bloquear/reportar/eliminar, responsable, notas, adjuntos/audio/plantillas, ficha, IA por chat y citas |
| Dashboard | Periodos, fechas, métricas, tendencias, distribución y equipo |
| Pipeline | Tablero/lista, búsqueda, etapas editables, movimiento y cierre con motivo |
| Contactos | Lista/cuadrícula, filtros, alta/edición, importar/exportar, consentimiento/baja, archivo y acceso al chat |
| Plantillas y campañas | Variables, medios, aprobación/revisión Meta, sincronización, audiencias, exclusiones, ejecución, pausa/reintento y resultados |
| Mailing | Remitente/DNS, listas/suscriptores/consentimiento, campañas, secuencias por días, vista previa/prueba, programación, confirmación, pausa/reanudación/cancelación y métricas |
| Administración | Servicios, empresas, cuentas/roles, créditos, disponibilidad de Mailing, suspensión/restauración |
| Ajustes y transversales | Perfil, WhatsApp, Calendar, notificaciones, integraciones, marca, equipo, ayuda/guías, navegación móvil, tema y cierre de sesión |

La fuente y paleta son locales. El naranja de marca por defecto es #E84B1D. Los acentos personalizados mantienen su selección por empresa, con foreground normal/hover calculado para legibilidad en ambos temas. No se modificaron secretos, endpoints, queries, schema ni adaptadores.

Entorno de revisión: 127.0.0.1:3100, BD independiente seomos_visual_030 en PostgreSQL local 5433, cuenta y contenidos ficticios. Proveedores WhatsApp/IA/Calendar/Resend simulados. La prueba no equivale a probar credenciales reales ni a desplegar.

La revisión estructural reorganiza navegación, dashboard, pipeline, contactos, agente y bandeja. El transporte SSE se comparte entre consumidores de cada pestaña: conserva eventos, reconexión y actualización de datos, y evita agotar las conexiones del navegador al abrir varias pestañas. No modifica la lógica de dominio ni el contrato del servidor.

Resultados y capturas vigentes: output/crm-visual-2026-10/qa-v2/. La prueba de tres pestañas está en qa-real/sse-multitab.json; qa-real conserva además la evidencia de la primera integración.
