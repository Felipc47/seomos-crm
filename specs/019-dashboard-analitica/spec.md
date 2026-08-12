# 019 — Dashboard de analítica comercial

## Objetivo

Dar al equipo una lectura inmediata y confiable del desempeño comercial sin
salir del CRM. La nueva sección **Dashboard** aparece al inicio del menú
principal y abre con los últimos 7 días.

## Métricas y semántica

- **Leads nuevos**: leads creados dentro del rango seleccionado.
- **Oportunidades activas**: leads nuevos del rango cuya etapa actual es
  abierta o cita agendada.
- **Reuniones programadas**: conversaciones cuya fecha de reunión cae dentro
  del rango. La base actual no conserva por separado la fecha en que se reservó.
- **Clientes logrados**: leads nuevos del rango cuya etapa actual es Cliente.
- **Conversión**: clientes logrados / leads nuevos del rango.
- **Sin asignar**: leads nuevos del rango sin ejecutivo responsable.
- **Embudo**: distribución por etapa actual de los leads creados en el rango.
- **Tendencia**: leads creados y reuniones programadas por día.
- **Servicios y equipo**: distribución de los leads nuevos por servicio y
  ejecutivo actuales, incluyendo “Sin servicio” y “Sin asignar”.

## Rangos

- Predeterminado: últimos 7 días, incluyendo hoy.
- Presets: Hoy, 7 días, 30 días y 90 días.
- Personalizado: fechas inicial y final inclusivas, hasta 366 días.
- Los cortes diarios usan la zona horaria configurada para el negocio; si no
  existe configuración, `America/Bogota`.

## Criterios de aceptación

1. Dashboard aparece antes de Bandeja para Admin, Comercial y Marketing, y no
   para Editor de agente.
2. La primera carga solicita 7 días y muestra tarjetas, embudo, tendencia,
   servicios y responsables con datos tenant-safe.
3. Cambiar un preset actualiza todas las métricas y deja el rango visible en la
   URL; recargar conserva la selección.
4. El rango personalizado valida fechas, orden y máximo de 366 días. Un rango
   inválido responde 422 sin consultar datos.
5. Todas las etapas aparecen en orden, incluso con conteo cero; sin datos la UI
   sigue siendo comprensible y no simula actividad.
6. Una empresa nunca ve datos de otra y un rol sin acceso recibe 403 en la API.
7. La interfaz funciona a 375, 768 y 1440 px, en claro y oscuro, sin overflow ni
   errores de consola.

## Fuera de alcance

- Comparación contra un periodo anterior, exportación y metas comerciales.
- Fecha histórica de cada cambio de etapa: el esquema actual solo conserva la
  etapa vigente. El embudo es una fotografía de la cohorte seleccionada.
- Fecha de creación de la reserva: “Reuniones” usa la fecha programada.
