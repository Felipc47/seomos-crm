# Self-test E2E — US28: Asignación y transferencia de chats

1. Crear propietario, compañero y una segunda empresa; conectar WhatsApp mock.
2. Ingresar chats propios, ajenos y sin asignar, incluido historial con adjunto.
3. Verificar opciones tenant-safe e identidad del miembro actual.
4. Activar “Asignados a mí” en UI y combinar con búsqueda/estado; filtrar por
   un compañero concreto del equipo y volver a la cola personal.
5. Mantener dos sesiones abiertas y transferir desde el encabezado del chat.
6. Confirmar mismo chat e historial exacto, aparición/desaparición por SSE y
   notificación enlazada al destinatario.
7. Repetir destino (idempotente), desasignar y transferir un chat sin prospecto.
8. Rechazar miembro ajeno, sesión ajena, ID inexistente y bodies inválidos.
9. Validar teclado, 375/768/1440 px, ausencia de overflow y consola limpia.

Ejecutar con la app local y mocks descritos en el quickstart:

```bash
bash tests/e2e/us28-asignacion-chats.sh
```
