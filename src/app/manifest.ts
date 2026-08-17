import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SEOMOS AI CRM",
    short_name: "SEOMOS CRM",
    description:
      "CRM de WhatsApp con bandeja compartida, pipeline comercial e inteligencia artificial supervisable.",
    start_url: "/",
    display: "standalone",
    background_color: "#080d13",
    theme_color: "#e84b1d",
    lang: "es-CO",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
