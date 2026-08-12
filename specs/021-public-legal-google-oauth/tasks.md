# Tasks: Sitio público y documentos legales para Google OAuth

## Phase 1: Specification and foundations

- [x] T001 Documentar alcance, requisitos de Google, decisiones y criterios en `spec.md` y `plan.md`
- [x] T002 Crear shell público compartido con navegación, pie y estilos accesibles

## Phase 2: Public routes

- [x] T003 Reemplazar `/` por la landing pública con explicación específica de Google Calendar
- [x] T004 Crear `/privacy` con divulgaciones de Google, seguridad, conservación, revocación y contacto
- [x] T005 Crear `/terms` con condiciones de cuenta, integraciones, IA, disponibilidad y contacto
- [x] T006 Añadir enlaces legales al login y a la navegación autenticada del CRM

## Phase 3: Verification and delivery

- [x] T007 Añadir guion E2E de navegación anónima, divulgaciones y 404
- [x] T008 Ejecutar `pnpm typecheck && pnpm lint && pnpm build && pnpm test`
- [x] T009 Ejecutar E2E local en Chrome y revisar visualmente escritorio/móvil
- [ ] T010 Desplegar y verificar `/`, `/privacy` y `/terms` en `https://crm.seomos.cloud`

## Dependencies

- T002 precede a T003–T005.
- T003–T006 preceden al E2E.
- T007–T009 deben estar verdes antes de T010.
