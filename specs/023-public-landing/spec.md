# Feature Specification: Landing pública robusta de SEOMOS AI CRM

**Feature Branch**: `023-public-landing`

**Created**: 2026-08-17

**Status**: Approved

**Input**: Reforzar la presentación pública de `seomos.cloud`, conservar el acceso al CRM y enlazarla con el servicio de SEOMOS en `seomos.com`.

## User Scenarios & Testing

### User Story 1 - Entender el producto y su valor (Priority: P1)

Como visitante, quiero comprender en el primer vistazo qué resuelve SEOMOS AI CRM para saber si sirve a mi operación comercial de WhatsApp.

**Independent Test**: Abrir `/` sin sesión y comprobar que identifica el producto, explica el flujo conversación → oportunidad → seguimiento y ofrece una demostración y acceso al CRM.

**Acceptance Scenarios**:

1. **Given** un visitante anónimo, **When** abre `/`, **Then** ve una propuesta clara, una representación fiel del producto y dos acciones diferenciadas: solicitar demostración e iniciar sesión.
2. **Given** un visitante interesado, **When** recorre la landing, **Then** entiende bandeja compartida, IA supervisable, pipeline, equipo, formularios y agendamiento.
3. **Given** un visitante, **When** activa el enlace de demostración o de SEOMOS, **Then** llega a `https://www.seomos.com/seomos-ai-crm/` en una pestaña segura.

### User Story 2 - Evaluar control y seguridad (Priority: P1)

Como responsable de negocio, quiero saber cómo se controla la IA y dónde viven los datos antes de considerar el producto.

**Independent Test**: Desde `/`, localizar la sección de control y confirmar que describe IA supervisable, transferencia humana, aislamiento por empresa, cifrado y servicio gestionado por SEOMOS.

### User Story 3 - Revisar integraciones y documentos (Priority: P2)

Como visitante o revisor de OAuth, quiero encontrar el uso limitado de Google Calendar y los documentos legales sin iniciar sesión.

**Independent Test**: Navegar desde `/` a Google Calendar, privacidad y términos y confirmar que todas las rutas siguen disponibles públicamente.

## Requirements

### Functional Requirements

- **FR-001**: `/` MUST presentar SEOMOS AI CRM como CRM de WhatsApp con IA supervisable y pipeline comercial.
- **FR-002**: El primer viewport MUST incluir propuesta de valor, CTA de demostración, acceso al login y una representación reconocible del producto.
- **FR-003**: La landing MUST explicar el flujo operativo en tres etapas y las capacidades actuales sin promesas estadísticas inventadas.
- **FR-004**: La landing MUST enlazar `https://www.seomos.com/seomos-ai-crm/` desde encabezado, hero, CTA final y pie.
- **FR-005**: La landing MUST mantener visibles `/login`, `/privacy`, `/terms` y la explicación de Google Calendar.
- **FR-006**: La landing MUST conservar legibilidad, jerarquía y acciones en tema claro, tema oscuro, escritorio y móvil.
- **FR-007**: La página pública MUST usar datos ficticios y no consultar ni exponer datos de tenants.
- **FR-008**: La implementación MUST preservar el área autenticada y no añadir dependencias de runtime.
- **FR-009**: La metadata MUST describir la nueva propuesta pública y usar `https://seomos.cloud` como dominio canónico.
- **FR-010**: La dirección visual pública MUST usar blanco, grises neutros, grafito, naranja SEOMOS y morado; MUST evitar fondos crema, amarillos o beige.
- **FR-011**: La página MUST presentar `seomos.cloud` como servicio gestionado por SEOMOS y MUST NOT afirmar que el servicio comercial es self-hosted.
- **FR-012**: El sitio público MUST exponer metadata indexable completa, canonical por ruta, Open Graph, X card, `robots.txt`, `sitemap.xml`, manifest y datos estructurados sin promesas no verificadas.

## Success Criteria

- **SC-001**: Un visitante identifica producto, beneficio y acción principal sin desplazarse en escritorio.
- **SC-002**: Los enlaces internos y externos críticos son navegables con teclado y tienen nombres accesibles.
- **SC-003**: No existe desbordamiento horizontal a 390 px ni errores de consola en la ruta pública.
- **SC-004**: `pnpm typecheck`, `pnpm lint`, `pnpm build` y `pnpm test` terminan verdes.

## Assumptions

- El dominio canónico del producto es `https://seomos.cloud`.
- La demostración comercial se gestiona desde `https://www.seomos.com/seomos-ai-crm/`.
- El correo público general de la marca es `info@seomos.com`.
- `seomos.cloud` es un servicio gestionado por SEOMOS; la arquitectura desplegable del repositorio no se comunica como modalidad del servicio comercial.
- No se añaden precios ni métricas de rendimiento hasta que el dueño entregue cifras verificables.

## Out of Scope

- Cambios en la bandeja, pipeline, autenticación, base de datos o integraciones.
- Facturación, planes o checkout.
- Cambios funcionales en el CRM autenticado durante el despliegue de la landing.
