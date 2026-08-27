# Data Model: Asistente de configuración del agente

La feature no agrega persistencia. Todos los objetos viven durante la solicitud o en el estado local del navegador.

## AssistantAnswers

- `websiteUrl`: URL pública opcional, máximo 2048 caracteres.
- `businessDescription`: descripción opcional, máximo 3000; obligatoria si no hay URL.
- `goal`: uno de ventas, calificación, soporte, agendamiento o información.
- `limits`: reglas/límites opcionales, máximo 2000.

Validación: debe existir `websiteUrl` o `businessDescription` con contenido.

## WebsiteContext

- `url`: URL final después de redirecciones seguras.
- `title`: título extraído opcional.
- `description`: meta descripción opcional.
- `text`: texto visible normalizado y acotado.

No se persiste. Cada destino, incluida cada redirección, debe resolver solo a direcciones públicas.

## AgentConfigurationDraft

- `name`: 1–60 caracteres.
- `greeting`: 1–2000 caracteres.
- `tonePresets`: 1–2 identificadores existentes y únicos.
- `tone`: matiz opcional, máximo 1000.
- `instructionSections`: las seis claves existentes, cada una con texto útil y dentro de 64000.
- `escalationRules`: 1–8000 caracteres.
- `knowledgeBlock`: 1–8000 caracteres.
- `summary`: explicación breve de qué se preparó.

El borrador se aplica a controles existentes. Solo las acciones actuales “Guardar comportamiento” y “Agregar bloque” producen persistencia.
