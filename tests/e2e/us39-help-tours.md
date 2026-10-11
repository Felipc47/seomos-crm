# US39 — Guía de ayuda en la pantalla real

Ejecutar `BASE_URL=http://localhost:3100 node tests/e2e/us39-help-tours.mjs` sobre una base local aislada y todos los proveedores apuntando a mocks (ver `specs/029-chat-ayuda/quickstart.md`). No admite dominios externos.

1. Preguntar con la variante de la captura del usuario «comp uedo inactivar la ia en un chat especifico». Debe reconocer pausa por conversación y pedir seleccionar si hace falta.
2. Iniciar Guíame en pantalla: la aplicación queda utilizable y no aparecen mutaciones automáticas. Seleccionar un chat y comprobar que el resaltado coincide con el switch real, en escritorio y móvil.
3. Pausar mediante el switch del CRM: el recorrido observa IA pausada y el segundo chat sigue activo. Un chat ya pausado no requiere repetir la acción.
4. Preguntar durante la guía y retomarla en el paso pendiente. Navegar desde Perfil hasta Bandeja sin perder el historial. Probar la guía de Perfil y cierre con Escape/foco.
5. Quitar temporalmente el marcador del control en el DOM de prueba: se informa de su ausencia y no se puede completar un paso inventado. Desactivar el agente general de prueba: el recorrido explica el control deshabilitado y permite salir.
6. Verificar contexto enumerado sin datos de clientes, outbox de WhatsApp vacío y cero errores de navegador. Guardar resultado y capturas en `.artifacts/us39-help-tours/`.

La regresión `us38-help-chat.mjs` comprueba además la guía de Automatizaciones de Mailing, autenticación, roles, empresas, fallo de proveedor, respuestas malformadas, red fallida y límite de solicitudes.
