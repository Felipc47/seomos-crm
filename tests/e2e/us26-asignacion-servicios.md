# US26 — Asignación de servicios a ejecutivos comerciales

**Objetivo**: configurar un ejecutivo por servicio y comprobar que cada lead
de Meta vinculado clasifica su servicio al llegar, que el comercial se marca
ÚNICAMENTE al derivar la conversación a atención humana, y que la asignación
se notifica de forma idempotente y es visible en Servicios, Equipo, Bandeja,
Etapas del prospecto y Contactos.

## Ejecución

```bash
# Requiere la app local en :3000 con los mocks internos y PostgreSQL en :5433.
# El guion reinicia la base de datos.
bash tests/e2e/us26-asignacion-servicios.sh
```

## Cobertura

- Admin asigna y quita responsables; comercial recibe 403.
- Miembro de Marketing, inexistente o de otra organización recibe 422.
- Team API y UI resumen los servicios de cada ejecutivo.
- Leadgen vinculado guarda el servicio SIN marcar comercial; al pedir un
  asesor (derivación) el lead queda asignado, crea una notificación navegable
  y se muestra igual en los tres módulos operativos.
- Diez entregas del mismo `leadgen_id` producen una sola notificación.
- Servicio sin responsable conserva servicio y no crea alerta personal.
- Cambiar el rol a Marketing libera la regla futura sin reescribir el lead ya
  asignado.
- Una tabla de notificaciones temporalmente no disponible no revierte ni
  bloquea el ingreso del prospecto, y la derivación asigna aunque la campana
  esté rota.
- UI responsive a 375, 768 y 1440 px, sin errores de navegador.
