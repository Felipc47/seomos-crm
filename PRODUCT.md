# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Agencias que despliegan y administran una instancia de Seomos para sus clientes.
- Administradores y operadores de cada negocio que atienden, organizan y convierten conversaciones de WhatsApp.

## Product Purpose

Seomos es un CRM self-hosted para conversaciones y prospectos de WhatsApp. Centraliza la bandeja, los contactos, el pipeline y un agente de IA supervisado que responde con el conocimiento del negocio y entrega la conversación a una persona cuando corresponde.

El producto tiene éxito cuando un negocio puede configurar y operar su atención por WhatsApp sin perder control sobre sus datos, sus reglas comerciales ni las conversaciones que requieren intervención humana.

## Positioning

Una sola instancia aloja varias organizaciones aisladas y combina CRM operativo, WhatsApp Cloud API y un agente de IA configurable sin depender de una plataforma centralizada para autenticación o datos.

## Operating Context

- El superadministrador crea organizaciones y sus administradores; el registro público permanece cerrado.
- Cada organización configura su conexión de WhatsApp, equipo, servicios, conocimiento y comportamiento del agente.
- El agente actúa en conversaciones reales, recopila información del prospecto, puede apoyar el agendamiento y escala a humanos bajo reglas explícitas.
- Las integraciones opcionales deben degradar de forma segura sin bloquear el uso del CRM.

## Capabilities and Constraints

- Interfaz en español, con roles y permisos por organización.
- Bandeja de WhatsApp, contactos, pipeline, campañas, seguimientos, reuniones, notificaciones y analítica.
- El comportamiento del agente se configura mediante nombre, saludo, hasta dos tonos, secciones temáticas, reglas de escalado y base de conocimiento.
- Dependencias externas de runtime limitadas por la constitución a WhatsApp Cloud API, un proveedor LLM OpenRouter-compatible opcional, Google Calendar opcional y Resend opcional en sus alcances aprobados.
- Ningún secreto puede exponerse al navegador ni a logs; todo dato de dominio permanece aislado por organización.
- Las conversaciones históricas de prueba nunca pueden alcanzar la API real de WhatsApp.

## Brand Commitments

- Nombre: Seomos CRM.
- Voz: clara, directa y útil para equipos comerciales de habla hispana.
- Identidad adaptable por organización mediante white-label, conservando la estructura operativa del producto.

## Evidence on Hand

- Implementación funcional y especificaciones versionadas en el repositorio.
- Flujos E2E locales con mocks de WhatsApp, IA y Calendar.
- No se deben fabricar testimonios, cifras comerciales, precios ni afirmaciones de clientes.

## Product Principles

1. El usuario conserva control y revisión humana sobre la automatización.
2. La configuración compleja debe convertirse en tareas guiadas y comprensibles.
3. El agente solo afirma información autorizada y escala lo incierto.
4. La soberanía, el aislamiento entre organizaciones y la seguridad prevalecen sobre la conveniencia.
5. Una capacidad no está terminada hasta comprobar su comportamiento observable.

## Accessibility & Inclusion

La interfaz debe ser operable con teclado, conservar foco visible, comunicar estados sin depender solo del color y adaptarse a escritorio y móvil.
