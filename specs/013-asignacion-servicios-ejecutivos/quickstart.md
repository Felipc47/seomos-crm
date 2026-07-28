# Quickstart: Verificación de asignación de servicios

## Preparación

1. Arrancar PostgreSQL local y la aplicación con los mocks internos habilitados.
2. Crear una organización administradora y conectar el mock de WhatsApp.
3. Crear dos cuentas con rol “Ejecutivo comercial”.
4. Crear los servicios “SEO” y “Desarrollo web”.

## Camino feliz

1. En Servicios, asignar SEO al primer ejecutivo y Desarrollo web al segundo.
2. Vincular un formulario distinto a cada servicio.
3. Simular un leadgen nuevo para el formulario de SEO.
4. Verificar que:
   - el prospecto guarda servicio SEO y el primer ejecutivo;
   - Bandeja, Etapas del prospecto y Contactos muestran ambos datos;
   - la campana del primer ejecutivo recibe una notificación navegable;
   - el segundo ejecutivo no recibe esa notificación.
5. Repetir exactamente el mismo `leadgen_id` diez veces y comprobar que existe
   una sola notificación.

## Caminos infelices

1. Quitar el responsable de Desarrollo web y simular un lead:
   - el prospecto entra;
   - conserva Desarrollo web;
   - aparece “Sin asignar”;
   - no se crea notificación personal.
2. Intentar asignar como comercial:
   - otro miembro de otra empresa;
   - un miembro de Marketing;
   - un ID inexistente.
   Todos deben rechazarse sin cambiar el servicio.
3. Iniciar sesión como comercial e intentar cambiar el responsable: debe
   responder 403 y mantener la configuración.
4. Cambiar el rol del primer ejecutivo a Marketing: SEO queda “Sin asignar” y
   el prospecto anterior conserva su responsable histórico.
5. Forzar fallo de notificación: el prospecto queda asignado y el ingreso no
   se revierte ni se cuelga.

## Responsive y regresión

- Revisar Servicios, Equipo y las tres superficies comerciales a 375, 768 y
  1440 px sin overflow horizontal.
- Confirmar consola sin errores y navegación por la notificación funcional.
- Ejecutar el gate completo y las regresiones de leadgen, servicios y edición
  unificada de prospectos.
