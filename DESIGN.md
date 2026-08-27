---
name: "Seomos CRM"
description: "Un centro de operaciones comercial denso, claro y adaptable por organización."
colors:
  primary: "#e84b1d"
  primary-hover: "#c43d15"
  primary-tint: "rgba(232, 75, 29, 0.08)"
  primary-soft: "rgba(232, 75, 29, 0.14)"
  ai-accent: "#5b358b"
  background: "#f6f2ea"
  surface: "#ffffff"
  surface-muted: "#faf7f1"
  surface-hover: "#f1ece3"
  text: "#0b0b0d"
  text-secondary: "rgba(11, 11, 13, 0.62)"
  text-tertiary: "rgba(11, 11, 13, 0.42)"
  border: "rgba(11, 11, 13, 0.11)"
  border-strong: "rgba(11, 11, 13, 0.20)"
  success: "#2fa35a"
  warning: "#e8a13d"
  danger: "#cf4322"
  on-primary: "#ffffff"
typography:
  display:
    fontFamily: "Poppins, Nunito, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Poppins, Nunito, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Poppins, Nunito, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Nunito, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Nunito, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
rounded:
  sm: "9px"
  md: "12px"
  lg: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  row: "11px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  input:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "20px"
  badge:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  nav-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "11px 13px"
  slide-over:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    width: "440px"
---

# Design System: Seomos CRM

## Overview

**Creative North Star: "Centro de operaciones sereno"** *(descripción basada en evidencia del producto y la implementación)*

Seomos CRM se comporta como un centro de operaciones comercial: concentra mucha información y muchas acciones, pero mantiene cada tarea legible mediante superficies cálidas, jerarquías compactas y controles familiares. La identidad se apoya en una base crema y blanca; el acento señala selección, progreso y acción sin teñir toda la interfaz.

El sistema está optimizado para operar, no para exhibirse. Cards, campos, listas y navegación mantienen una cadencia consistente; Poppins da estructura a títulos y Nunito sostiene la lectura continua. El tema oscuro conserva las mismas relaciones semánticas, y el acento puede cambiar por organización sin alterar la estructura ni el comportamiento de los componentes.

**Key Characteristics:**

- Denso pero calmado: mucha capacidad con separación, contraste y agrupación claros.
- Superficies cálidas y bordes suaves antes que contenedores pesados.
- Acento escaso, funcional y compatible con white-label.
- Jerarquía tipográfica compacta para lectura rápida en español.
- Estados visibles por color, texto, iconos y foco; nunca por color solamente.
- Navegación y controles equivalentes en escritorio y móvil.

## Colors

La paleta combina papel cálido y superficies blancas con un acento naranja operativo; todos los roles se implementan mediante variables semánticas para admitir tema oscuro y white-label.

### Primary

- **Naranja operativo:** acción principal, selección activa, foco y énfasis de marca; su valor de runtime corresponde a `--accent` y puede sobrescribirse por organización.
- **Naranja de respuesta:** estado hover de acciones principales; mantiene contraste con texto blanco.
- **Velos de acento:** `primary-tint` y `primary-soft` crean fondos de selección, iconos y anillos de foco sin convertir bloques completos en naranja sólido.

### Secondary

- **Verde de éxito:** confirmaciones y estados positivos, acompañado por texto o iconografía.
- **Ámbar de atención:** avisos que requieren lectura sin adoptar el peso visual de un error.
- **Rojo de riesgo:** errores y acciones destructivas, con variantes suaves de fondo, borde y texto definidas en CSS.

### Tertiary

- **Morado de IA:** marcador secundario reservado para señales de inteligencia artificial; no compite con el acento de acción.

### Neutral

- **Crema de operación:** fondo general que reduce el contraste ambiental y separa la aplicación de sus superficies.
- **Blanco de superficie:** cards, paneles, navegación y overlays.
- **Marfil de control:** campos, chips y superficies secundarias.
- **Tinta principal:** texto de máxima jerarquía y controles activos.
- **Tintas secundarias:** contenido auxiliar, metadatos y placeholders con opacidad decreciente.
- **Bordes de baja voz:** divisores y límites de control; la variante fuerte se reserva para selección, hover o controles que necesitan más definición.

**The Accent Is a Signal Rule.** Reserva el acento sólido para acciones, selección y estado activo; usa tintes para contexto y evita grandes superficies decorativas.

**The Semantic Theme Rule.** Consume roles semánticos, no colores literales, para que tema oscuro y white-label conserven contraste y jerarquía.

## Typography

**Display Font:** Poppins (con Nunito y sans-serif como respaldo)  
**Body Font:** Nunito (con la fuente del sistema como respaldo)  
**Label Font:** Nunito

**Character:** Poppins aporta encabezados firmes y compactos; Nunito mantiene formularios, tablas, mensajes y navegación cálidos y fáciles de recorrer. Ambas familias se sirven localmente mediante `next/font` y admiten pesos de 400 a 800.

### Hierarchy

- **Display** (700, 28px, 1.15): métricas o encabezados principales con espacio suficiente; no es el tamaño por defecto de cada pantalla.
- **Headline** (700, 22px, 1.25): título recurrente de página, panel o flujo principal.
- **Title** (600, 17px, 1.25): títulos de cards y grupos de contenido.
- **Body** (500, 14px, 1.5): lectura operativa, descripciones y formularios; los párrafos explicativos suelen limitarse a unas 65–68ch.
- **Label** (700, 13px, 1.25): etiquetas, botones, navegación y datos que requieren escaneo rápido.

**The Two-Family Rule.** Usa Poppins para estructura y Nunito para operación; no introduzcas una tercera voz tipográfica para resolver jerarquías locales.

**The Compact Hierarchy Rule.** Resuelve la jerarquía primero con familia, peso y espaciado; reserva saltos grandes de tamaño para métricas o contextos públicos.

## Layout

La aplicación usa una shell operativa de altura completa. En escritorio, la navegación ocupa una columna fija de 250px y el contenido restante se adapta; a partir de móvil, la sidebar se convierte en encabezado compacto y tab bar inferior desplazable. Los cambios estructurales observados ocurren en 640px (`sm`), 768px (`md`) y 1024px (`lg`).

Las pantallas combinan encabezados con borde inferior, áreas de contenido desplazables y grids que pasan de una a dos columnas en escritorio. La cadencia base usa incrementos de 4px, con espacios recurrentes de 8, 12, 16, 20 y 24px. Formularios y cards conservan densidad media: controles de 40–44px, filas cercanas a 11px de padding vertical y texto auxiliar de 11–13px.

Los paneles de tarea pueden usar slide-over: ocupan todo el ancho en móvil y una columna de 440px en pantallas desde `sm`, con contenido desplazable y acciones persistentes al pie. Este patrón sirve a tareas acotadas sin sacar al operador del contexto, pero no convierte la composición interna de un flujo concreto en plantilla universal.

**The Operate Density Rule.** Prioriza lectura y acción rápida: agrupa por cards y secciones, reduce a una columna en móvil y evita comprimir controles por debajo de sus alturas establecidas.

## Elevation & Depth

El sistema es plano por defecto y combina capas tonales, bordes sutiles y sombras cortas. Las sombras estructuran elementos que flotan —navegación activa, popovers, toasts, dialogs y slide-overs—; las cards de contenido permanecen delimitadas principalmente por superficie y borde. El tema oscuro preserva esta jerarquía, ajustando el acento y las superficies sin cambiar los roles.

### Shadow Vocabulary

- **Separación mínima** (`--shadow-sm`): controles seleccionados y microcapas.
- **Capa media** (`--shadow-md`): elementos elevados de complejidad moderada.
- **Capa flotante** (`--shadow-pop`): popovers y superficies transitorias.
- **Énfasis de acción** (`--shadow-accent`): navegación activa y botón primario; adopta el color del acento.
- **Overlay lateral:** sombra direccional hacia la izquierda para separar un slide-over del contexto sin elevar cada sección interna.

**The Flat at Rest Rule.** Las superficies permanentes se apoyan en tono y borde; la sombra aparece cuando un elemento flota, se selecciona o requiere separación transitoria.

## Shapes

La forma dominante es suavemente redondeada: controles pequeños usan 9px, botones y campos 12px, cards y dialogs 16px. Badges, avatares, estados y switches usan forma de píldora o círculo. Los bordes son finos y de bajo contraste; el radio debe comunicar familia de componente, no decorar cada bloque con una silueta distinta.

El sistema evita extremos cuadrados y redondeos excesivamente blandos en contenedores grandes. Las superficies recortan contenido solo cuando el patrón lo exige —avatares, imágenes de marca o dialogs— y mantienen foco visible fuera del borde cuando corresponde.

## Components

### Buttons

- **Shape:** bordes suavemente curvos (12px) y altura base de 40px; tamaños pequeño y grande conservan la misma familia.
- **Primary:** acento sólido, texto blanco, peso fuerte y sombra de acento; es la acción dominante del grupo.
- **Hover / Focus:** el hover usa el acento de respuesta; el foco visible usa un anillo de 2px y no depende del cambio de color.
- **Secondary / Outline / Ghost:** superficie secundaria, borde o fondo transparente según jerarquía; todos conservan texto de alto contraste y estado hover tonal.
- **Disabled:** bloquea interacción y reduce opacidad sin ocultar la etiqueta.

### Chips

- **Style:** forma de píldora, tipografía compacta y relleno horizontal corto. El badge principal usa acento sólido; estados funcionales combinan fondo, borde y texto del mismo rol.
- **State:** la selección puede usar tinte de acento con marca circular o check; el significado siempre permanece en texto o icono.

### Cards / Containers

- **Corner Style:** radio amplio contenido (16px).
- **Background:** superficie blanca en claro y superficie elevada semántica en oscuro.
- **Shadow Strategy:** plana en reposo; profundidad por borde y contraste tonal.
- **Border:** trazo semántico de bajo contraste.
- **Internal Padding:** 20px como base recurrente, con 16px o 24px según densidad del contenido.

### Inputs / Fields

- **Style:** altura de 44px, superficie secundaria, borde fino, radio de 12px y texto de cuerpo medio.
- **Focus:** borde de acento más anillo suave de 2px; el contorno nunca se elimina sin sustituto.
- **Error / Disabled:** `aria-invalid` acompaña el mensaje visible; el estado deshabilitado conserva contenido y reduce opacidad.

### Navigation

- **Desktop:** sidebar fija de 250px, items compactos con iconos lineales; el item activo usa acento sólido, texto blanco y sombra de acento.
- **Mobile:** encabezado compacto y tab bar inferior desplazable; conserva destinos y estado activo, expresado mediante acento, etiqueta e icono.
- **Hover / Focus:** los items inactivos pasan a superficie secundaria y tinta principal; todo control navegable mantiene foco visible.

### Switches

- **Style:** track de píldora con thumb blanco y movimiento horizontal de 200ms; encendido usa acento y apagado borde fuerte.
- **State:** expone `role="switch"` y `aria-checked`; disabled conserva posición y reduce opacidad.

### Slide-overs

- **Style:** panel lateral blanco de ancho completo en móvil y 440px desde `sm`, con overlay oscuro y sombra direccional.
- **Behavior:** entra desde la derecha, atrapa el foco, cierra con Escape o overlay y restaura el foco al origen.
- **Motion:** el desplazamiento usa 260ms con curva suave; `prefers-reduced-motion` reduce animaciones a una duración prácticamente inmediata.

## Do's and Don'ts

### Do:

- Do: usa los roles semánticos de color y verifica cada control en tema claro, oscuro y con un acento white-label distinto.
- Do: conserva Poppins para encabezados y Nunito para controles, navegación y lectura operativa.
- Do: construye jerarquía con cards, bordes sutiles, espaciado y tinta antes de añadir sombras.
- Do: acompaña éxito, atención y error con texto o iconografía, y conserva foco visible para teclado.
- Do: adapta grids, navegación y paneles a una sola columna o ancho completo en móvil.

### Don't:

- Don't: no uses naranja literal en componentes de aplicación cuando existe el token semántico de acento.
- Don't: no conviertas tintes o cards de una feature puntual en una nueva identidad visual global.
- Don't: no uses sombras fuertes en superficies permanentes ni eleves todas las cards por defecto.
- Don't: no introduzcas otra familia tipográfica, radios arbitrarios o una escala de espaciado paralela.
- Don't: no dependas solo del color para comunicar selección, error, estado o disponibilidad.
