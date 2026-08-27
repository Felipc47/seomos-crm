# Research: Asistente de configuración del agente

## Decisión 1 — Borrador antes de persistencia

- **Decision**: La IA produce una propuesta revisable que se aplica únicamente al estado local de los formularios.
- **Rationale**: Protege contenido existente, mantiene al administrador en control y reutiliza las validaciones/guardados actuales.
- **Alternatives considered**: guardar el perfil y el KB desde el endpoint de generación; se rechazó por mezclar generación con efectos persistentes y hacer más costosa la cancelación.

## Decisión 2 — URL opcional y tres respuestas

- **Decision**: Una sola pantalla solicita sitio web opcional, descripción del negocio, objetivo principal y límites importantes; URL o descripción satisfacen el contexto mínimo.
- **Rationale**: Cumple “un par de preguntas y/o pida el site” sin convertir el flujo en un onboarding largo.
- **Alternatives considered**: chat abierto y wizard de muchos pasos; se rechazaron por aumentar fricción y hacer menos predecible la cobertura de campos.

## Decisión 3 — Lectura propia, acotada y segura

- **Decision**: Usar módulos HTTP/HTTPS de Node con resolución DNS validada inyectada en la conexión, redirecciones manuales, límites de tiempo/tamaño y extracción básica de texto.
- **Rationale**: Evita una dependencia externa y cierra la brecha de DNS rebinding que deja una validación previa separada de la conexión.
- **Alternatives considered**: `fetch` directo tras revisar hostname; se rechazó por la ventana entre resolución y conexión. Servicio de scraping externo; prohibido por soberanía y foco.

## Decisión 4 — Prompt de transformación, no de navegación

- **Decision**: El modelo recibe respuestas y texto ya extraído, marcado como contenido no confiable, con esquema cerrado y reintentos del adaptador existente.
- **Rationale**: El LLM no navega, no sigue instrucciones del sitio y no recibe autoridad sobre guardado o activación.
- **Alternatives considered**: agente con herramientas de navegación; innecesario y demasiado amplio para el alcance.

## Decisión 5 — Sin consumo de créditos operativos

- **Decision**: La generación administrativa no descuenta créditos destinados a turnos de atención o seguimientos.
- **Rationale**: Los créditos actuales gobiernan trabajo sobre conversaciones; cambiar su semántica requiere una decisión comercial separada.
- **Alternatives considered**: descontar un crédito por borrador; se difiere hasta definir precio/uso administrativo explícito.
