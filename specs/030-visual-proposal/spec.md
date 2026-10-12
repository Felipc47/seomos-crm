# Diseño integrado en el CRM real local

Solicitud: diseño más limpio y moderno, sin crema/beige, colores SEOMOS, nueva tipografía e iconografía, claro por defecto y oscuro opcional. No desplegar.

## Alcance vigente: integración en el CRM real local (12 de octubre)

El usuario eligió expresamente «Integrar en el CRM real local». Esta fase reemplaza la frontera anterior de solo maqueta: aplicar el sistema visual a los componentes existentes, conservando todas las opciones, permisos, handlers, endpoints y atributos de ayuda. No replicar lógica en una maqueta ni reducir la pantalla del agente. Sin despliegue, push, datos de producción ni comunicaciones externas.

- Preservar Agente completo: interruptor y créditos, asistente de configuración con borrador revisable, identidad/tonos, entrenamiento por secciones, escalado, conocimiento, seguimiento y agendamiento.
- Preservar todos los módulos: dashboard, bandeja y sus acciones, etapas, contactos, plantillas, campañas, mailing, servicios, empresas, notificaciones, ayuda y ajustes según permisos.
- Sistema de color: superficies blancas/gris neutro; naranja #E84B1D en acciones compactas e indicadores, sin resplandores ni paneles grandes naranjas. Estados semánticos distinguibles. Tema claro inicial aunque el sistema esté oscuro; recordar selección explícita.
- Fuente Manrope autocontenida e iconografía Lucide. Revisar legibilidad, teclado y móvil.
- Ejecutar la aplicación real contra datos ficticios y proveedores locales de prueba. Verificar navegación de todas las rutas y recorridos reales de configuración, persistencia y errores.

## Criterios de conservación y entrega

- Reutilizar los componentes reales y sus acciones, con los mismos permisos y contratos de datos.
- Navegación móvil completa, foco visible, etiquetas accesibles y respeto a reducción de movimiento.
- Contraste de texto calculado para el naranja y los acentos personalizados, incluido hover.
- Typecheck, lint, build, tests y recorridos de navegador con persistencia y errores observables.
- Evidencia en `output/crm-visual-2026-10/qa-real/`; servidor exclusivo en loopback, base ficticia independiente y mocks. Nada se publica.

## Historial de la exploración

La maqueta independiente del puerto 4317 fue la primera fase. El usuario pidió más contraste naranja y después rechazó su exceso de saturación. Esa exploración se conserva como referencia, pero su frontera de no modificar componentes quedó sustituida por la autorización explícita de integrar en el CRM real local. El diseño vigente usa el naranja correcto de forma puntual sobre superficies neutras.

## Revisión estructural solicitada el 12 de octubre

El usuario considera demasiado conservadora la primera integración. La nueva revisión debe transformar también composición y jerarquía: navegación grafito, área de trabajo clara enmarcada, cabeceras amplias, barras de herramientas separadas, pipeline con columnas y tarjetas estructuradas, contactos en una lista unificada, métricas agrupadas y agente completo mejor organizado. Mantener el naranja #E84B1D puntual, ambos temas y todos los controles reales.

La interacción local debe funcionar con varias pestañas. Se reprodujo un bloqueo por cuatro conexiones SSE por pantalla, que saturan las seis conexiones HTTP/1.1 disponibles al abrir otra pestaña. Compartir una conexión entre consumidores de cada pestaña, conservar eventos, callbacks y recuperación al reconectar; verificar varias pestañas y tiempo real.

## Promoción a producción autorizada (12 de octubre de 2026)

El usuario autoriza desplegar este cambio y exige registro en GitHub y reversión documentada. Se prepara una PR selectiva, etiqueta del commit anterior saludable y GitHub Release con la revisión publicada. Ver [release.md](release.md) para alcance, evidencia y procedimiento de retorno. No introducir modificaciones de datos ni migraciones.
