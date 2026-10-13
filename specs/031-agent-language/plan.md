# Plan

Añadir responseLanguage tipado a agent_profile con migración additive, NOT NULL/default es/check; enum Zod compartido en API y selector; política compartida en prompt principal y seguimiento. Sin credenciales ni proveedor nuevo. Mantener scoped() y permisos existentes. Checkout aislado sobre origin/main para conservar el trabajo local. Probar gate, navegador y mocks sobre una BD local exclusiva. Commit y push a main autorizado, esperar Coolify y verificar HTTPS/UI autenticada.
