/**
 * White-label: nombre del CRM + acento por organización.
 * Presets sobrios del sistema Atlas; para un color personalizado se derivan
 * hover/soft/tint/text y se garantiza contraste con texto blanco.
 */

export type AccentSet = {
  accent: string;
  hover: string;
  soft: string;
  tint: string;
  text: string;
};

export type Branding = {
  name: string;
  accent: string; // hex del acento base elegido
};

export const DEFAULT_BRANDING: Branding = { name: "Seomos CRM", accent: "#e84b1d" };

/** Presets del handoff (valores exactos) + la marca Seomos (naranja). */
export const ACCENT_PRESETS: Record<string, { label: string; set: AccentSet }> = {
  "#e84b1d": {
    label: "Naranja Seomos",
    set: { accent: "#e84b1d", hover: "#c43d15", soft: "#fbe0d6", tint: "#fef4f0", text: "#b23a12" },
  },
  "#3f5972": {
    label: "Azul acero",
    set: { accent: "#3f5972", hover: "#334a60", soft: "#dde5ee", tint: "#f3f6f9", text: "#2b4056" },
  },
  "#4b5563": {
    label: "Grafito",
    set: { accent: "#4b5563", hover: "#3b4350", soft: "#e2e5ea", tint: "#f4f5f7", text: "#333a45" },
  },
  "#3f6b66": {
    label: "Verde apagado",
    set: { accent: "#3f6b66", hover: "#335752", soft: "#dcebe8", tint: "#f2f8f6", text: "#2b4a46" },
  },
  "#5f5470": {
    label: "Ciruela",
    set: { accent: "#5f5470", hover: "#4d4459", soft: "#e6e1ec", tint: "#f6f4f8", text: "#443c52" },
  },
};

type Rgb = { r: number; g: number; b: number };

export function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

function hexToRgb(hex: string): Rgb {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mezcla `color` hacia `target` en proporción t (0..1). */
function mix(color: Rgb, target: Rgb, t: number): Rgb {
  return {
    r: color.r + (target.r - color.r) * t,
    g: color.g + (target.g - color.g) * t,
    b: color.b + (target.b - color.b) * t,
  };
}

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };

/** Luminancia relativa (WCAG). */
function luminance({ r, g, b }: Rgb): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Mantiene blanco legible en superficies sólidas, ajustando solo su luminosidad. */
function whiteTextBackground(hex: string): string {
  let base = hexToRgb(hex);
  while (1.05 / (luminance(base) + 0.05) < 4.5) {
    // Medir el hex final evita que el redondeo vuelva a bajar de 4,5:1.
    base = hexToRgb(rgbToHex(mix(base, BLACK, 0.02)));
  }
  return rgbToHex(base);
}

/** Set de marca: superficies sólidas con contraste >= 4,5:1 para texto blanco. */
export function resolveAccentSet(accentHex: string): AccentSet {
  const preset = ACCENT_PRESETS[accentHex.toLowerCase()];
  if (preset) {
    const accent = whiteTextBackground(preset.set.accent);
    const hover = whiteTextBackground(preset.set.hover);
    return accent === preset.set.accent && hover === preset.set.hover
      ? preset.set : { ...preset.set, accent, hover };
  }
  if (!isValidHex(accentHex)) return ACCENT_PRESETS["#3f5972"]!.set;
  const base = hexToRgb(whiteTextBackground(accentHex.toLowerCase()));
  return {
    accent: rgbToHex(base),
    hover: rgbToHex(mix(base, BLACK, 0.16)),
    soft: rgbToHex(mix(base, WHITE, 0.82)),
    tint: rgbToHex(mix(base, WHITE, 0.94)),
    text: rgbToHex(mix(base, BLACK, 0.28)),
  };
}

/** Las superficies normalizadas de marca usan texto e iconos blancos. */
export function accentForeground(_color: string): string {
  return "#ffffff";
}

/** CSS de variables para inyectar en el <head> (SSR, sin flash). */
export function accentCssVariables(accentHex: string): string {
  const s = resolveAccentSet(accentHex);
  // Se conserva el acento propio en ambos temas; los paneles permanecen
  // neutros y el texto de marca se aclara sobre las superficies oscuras.
  const darkText = rgbToHex(mix(hexToRgb(s.accent), WHITE, 0.55));
  return `:root,.dark{--accent:${s.accent};--accent-hover:${s.hover};--accent-contrast:${accentForeground(s.accent)};--accent-hover-contrast:${accentForeground(s.hover)};--accent-soft:${s.accent}29;--accent-text:${s.text};}.dark{--accent-text:${darkText};}`;
}

export function normalizeBranding(input: Partial<Branding> | null): Branding {
  const name = input?.name?.trim().slice(0, 30) || DEFAULT_BRANDING.name;
  const accent =
    input?.accent && isValidHex(input.accent)
      ? input.accent.toLowerCase()
      : DEFAULT_BRANDING.accent;
  return { name, accent };
}
