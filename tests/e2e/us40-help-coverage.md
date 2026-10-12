# US40 — Cobertura detallada y exportación/importación guiadas

Ejecutar `BASE_URL=http://localhost:3100 node tests/e2e/us40-help-coverage.mjs` sobre la base aislada y proveedores mock descritos en `specs/029-chat-ayuda/quickstart.md`. El script rechaza dominios externos.

1. Reproducir «como descargo mis leads» y «necesito exportar mis contactos» con el proveedor fallando. Deben seleccionar Exportar CSV sin negar la función ni depender del proveedor.
2. Comprobar instrucciones visibles/copiables, requisitos y resultado esperado. Iniciar guía no escribe datos ni descarga automáticamente; lleva a Contactos y resalta Exportar CSV.
3. Filtrar la pantalla por un contacto activo. Descargar mediante el clic explícito del usuario y comprobar archivo contactos.csv, BOM UTF-8 y seis columnas. Debe incluir otro contacto archivado que no aparece en el filtro, y excluir una empresa ajena; repetir aislamiento desde la sesión ajena.
4. Explorar Funciones del CRM: búsqueda, filtro por sección, apertura local sin llamada al proveedor y guía real de Seguimiento del agente.
5. Abrir guía de Importar CSV y señalar Plantilla/Importar CSV. Importar un archivo local con un contacto válido, un teléfono duplicado y una línea inválida. Debe crear uno, conservar el existente, indicar la línea y no inventar consentimiento.
6. Índice y exportación guiada en 390×844, sin desbordamiento, con capturas. Un editor de agente no ve guías de Contactos/Empresas/Mailing/Equipo ni la exportación.
7. Cero errores de navegador. Resultado y capturas en `.artifacts/us40-help-coverage/`.

La clasificación por tareas de todos los módulos, búsquedas y acceso se verifica además en `tests/unit/help-coverage.test.ts`. La regresión de provider/red/roles usa US38; el estado de IA y los recorridos de conversación usan US39.
