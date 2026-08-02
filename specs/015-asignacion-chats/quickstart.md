# Quickstart: Asignación y transferencia de chats

## Preparación

1. Reiniciar la BD local de prueba y aplicar migraciones existentes.
2. Iniciar la app con mocks de WhatsApp/IA y crear una empresa con propietario.
3. Crear un segundo miembro en la misma empresa y una empresa ajena con otro
   miembro.
4. Ingresar al menos tres chats: uno asignado al propietario, uno al segundo
   miembro y uno sin asignar. Añadir varios mensajes y un adjunto al primero.

## Flujo principal

1. Abrir `/inbox` como propietario y activar “Asignados a mí”.
2. Confirmar que solo aparece su chat y que búsqueda, etapa y no leídos siguen
   acotados a esa asignación.
3. Abrir el chat y elegir “Transferir chat” desde el encabezado.
4. Seleccionar al segundo miembro y confirmar.
5. Verificar toast, insignia nueva y que el hilo mantiene el mismo ID, todos los
   IDs de mensajes, adjunto, contenido, orden y estados.
6. Con una segunda sesión abierta y filtro “Asignados a mí”, comprobar que el
   chat aparece sin recargar y la campana contiene una alerta enlazada.
7. En la primera sesión confirmar que el chat desaparece de “Asignados a mí” y
   sigue disponible en “Todos los responsables”.

## Desasignar e idempotencia

1. Transferir el chat a “Sin asignar”; comprobar historial intacto y ausencia en
   ambas colas personales.
2. Asignarlo de nuevo al segundo miembro y repetir exactamente la solicitud.
3. Confirmar `changed=false` y que solo existe una notificación de esa asignación.

## Caminos infelices

1. Manipular `memberId` con el miembro de la empresa ajena: esperar 422 y ninguna
   mutación.
2. Usar la sesión ajena con el ID del chat: esperar 404 y cero exposición.
3. Transferir un ID inexistente y un chat de Laboratorio: esperar 404.
4. Abrir un chat sin prospecto, transferirlo y verificar que se crea uno mínimo
   sin modificar contacto, conversación ni mensajes.
5. Enviar body vacío, string y campos extra: esperar 422 sin cambios.
6. Simular o provocar fallo secundario de notificación y confirmar que la
   asignación persiste y la interfaz no se cuelga.

## UI y regresión

1. Probar selector, menú, diálogo y encabezado con teclado.
2. Validar 375, 768 y 1440 px sin overflow ni acciones fuera de viewport.
3. Confirmar consola limpia, SSE, anclar/archivar, moderación, IA y envío manual.
4. Ejecutar `tests/e2e/us28-asignacion-chats.sh`, regresiones de Bandeja y
   servicios, y el gate técnico completo.
