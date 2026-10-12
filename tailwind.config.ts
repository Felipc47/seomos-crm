import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Los nombres semánticos existentes (background, primary, muted…) se remapean
 * a los tokens del sistema Atlas para que toda la app comparta el tema claro;
 * la escala `brand-*` expone el acento white-label.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        input: "var(--border-strong)",
        ring: "var(--accent)",
        background: "var(--bg)",
        foreground: "var(--text)",
        subtle: "var(--bg-subtle)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        sidebar: "var(--sidebar)",
        mute: "var(--mute)",
        faint: "var(--faint)",
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-contrast)",
        },
        secondary: {
          DEFAULT: "var(--bg-panel)",
          foreground: "var(--text-2)",
        },
        destructive: {
          DEFAULT: "var(--danger)",
          foreground: "var(--danger-contrast)",
        },
        muted: {
          DEFAULT: "var(--bg-panel)",
          foreground: "var(--text-3)",
        },
        accent: {
          DEFAULT: "var(--bg-hover)",
          foreground: "var(--text)",
        },
        card: {
          DEFAULT: "var(--surface)",
          foreground: "var(--text)",
        },
        popover: {
          DEFAULT: "var(--surface)",
          foreground: "var(--text)",
        },
        brand: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
          tint: "var(--accent-tint)",
          text: "var(--accent-text)",
          "hover-foreground": "var(--accent-hover-contrast)",
        },
        "accent-2": "var(--accent-2)",
        "text-2": "var(--text-2)",
        "text-3": "var(--text-3)",
        "text-4": "var(--text-4)",
        chat: "var(--chat-bg)",
        "bubble-out": "var(--bubble-out)",
        "bubble-out-text": "var(--bubble-out-text)",
        success: "var(--success)",
        warning: "var(--warning)",
        "warning-bg": "var(--warning-bg)",
        "warning-border": "var(--warning-border)",
        "warning-fg": "var(--warning-fg)",
        "success-bg": "var(--success-bg)",
        "success-border": "var(--success-border)",
        "success-fg": "var(--success-fg)",
        "danger-bg": "var(--danger-bg)",
        "danger-border": "var(--danger-border)",
        "danger-fg": "var(--danger-fg)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        pop: "var(--shadow-pop)",
        accent: "var(--shadow-accent)",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "-apple-system", "sans-serif"],
        display: ["var(--font-manrope)", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [animate],
};

export default config;
