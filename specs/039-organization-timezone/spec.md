# 039 — Zona horaria por empresa

Solicitud y autorización del dueño (2026-11-06): permitir configurar la zona horaria desde Ajustes; SEOMOS y Baterías Conecta en Bogotá, Lion Data en Florida; probar y publicar sin nueva autorización.

- Cada administrador puede elegir una zona IANA mundial desde Ajustes → Zona horaria, ver la hora local y guardar. Funciona sin Google Calendar.
- Valor inicial general: America/Bogota. En producción se configuran explícitamente SEOMOS y Baterías Conecta con ese valor y Lion Data con America/New_York (supuesto: Florida oriental/Miami, con cambio estacional automático).
- La selección se comparte por empresa y alimenta mensajes, prospectos, notificaciones, campañas de email, reuniones nuevas, seguimientos y reportes. El navegador puede usar otra zona.
- Reuniones existentes conservan su instante y zona registrada; cambiar el ajuste no reprograma citas ni envíos existentes.
- Solo admin/owner puede editar; otros usuarios usan la zona pero no pueden modificarla. Datos ajenos permanecen aislados.
- Rechazar zonas inválidas y cuerpos con campos desconocidos; mostrar fallo de red y permitir reintentar sin perder la selección.

Identidad productiva comprobada: la empresa principal tiene marca SEOMOS; Lion Data es `Lion Data`; la cuenta de baterías existente se llama `Baterias Mac Center`. Se preguntó al dueño si esta última corresponde a Baterías Conecta. Hasta respuesta se conserva Bogotá, igual al valor predeterminado. SMANOVA no se modifica.
