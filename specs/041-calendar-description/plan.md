# Plan
1. Definir valor inicial y renderizado acotado de nombre/teléfono.
2. Extender la configuración en metadata, el PUT parcial y el formulario de calendario.
3. Usar el valor de la empresa en el único servicio de creación de reuniones.
4. Verificar unidades, typecheck, lint, build y E2E Playwright con WhatsApp/LLM/Google mock aislados.

Constitución: metadata ya existente con organización explícita; permisos existentes; adaptador Google existente; sin secretos ni proveedores nuevos. Se conserva la validación Zod, el sandbox de mensajes y la degradación de Calendar. Checkout separado para preservar todo trabajo previo.
