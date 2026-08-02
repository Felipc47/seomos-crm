# Quickstart: Verificación de gestión y moderación de chats

## Preparación

1. Arrancar PostgreSQL local y aplicar migraciones al iniciar la aplicación.
2. Arrancar el CRM con mocks internos de WhatsApp e IA.
3. Crear dos organizaciones y al menos cuatro contactos con conversaciones y
   mensajes en la organización principal.
4. Conectar la organización principal al número mock de WhatsApp.

## Camino feliz

1. Abrir Bandeja, usar el menú de una conversación y eliminarla.
2. Confirmar que desaparece y que contacto/prospecto siguen en sus vistas.
3. Ingresar otro mensaje mock del mismo número y confirmar que reaparece una
   conversación nueva sin duplicar contacto/prospecto.
4. Activar selección, marcar dos chats, comprobar contador y “seleccionar
   visibles”, cancelar una eliminación y luego confirmar otra.
5. Bloquear un contacto y verificar indicador, compositor deshabilitado y
   presencia en la lista de bloqueados del mock de Meta.
6. Intentar texto, archivo, plantilla, campaña, seguimiento y turno IA; todos
   deben omitir o rechazar ese contacto.
7. Desbloquear y confirmar que el compositor vuelve y Meta ya no lo lista.
8. Reportar un chat con razón/notas y reportar dos en lote; comprobar indicador
   y auditoría sin bloqueo automático.

## Caminos infelices

1. Simular fallo de Meta al bloquear: el contacto debe quedar bloqueado
   localmente, sin envíos, con advertencia y estado reintentable.
2. Simular fallo al desbloquear: el contacto debe permanecer bloqueado.
3. Enviar IDs repetidos, más de 100, vacíos, de laboratorio y de otra
   organización: deben rechazarse o ignorarse de forma segura según contrato.
4. Eliminar una conversación ya eliminada en otra sesión: la UI debe
   refrescarse sin afectar otros chats.
5. Confirmar que las rutas mock siguen respondiendo 404 cuando el entorno es
   producción.

## Responsive y accesibilidad

- Probar 375, 768 y 1440 px.
- Verificar que checkboxes, barra masiva, diálogos y menús se alcanzan por
  teclado, tienen nombre accesible y no generan desplazamiento horizontal.
- Confirmar consola limpia y ausencia de estados ocupados permanentes.

## Gates

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test
bash tests/e2e/us27-gestion-chats.sh
```
