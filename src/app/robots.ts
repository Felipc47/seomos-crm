import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy", "/terms", "/og.png", "/brand/"],
      disallow: [
        "/api/",
        "/agent",
        "/campaigns",
        "/companies",
        "/contacts",
        "/dashboard",
        "/inbox",
        "/login",
        "/notifications",
        "/pipeline",
        "/register",
        "/services",
        "/settings",
        "/templates",
      ],
    },
    sitemap: "https://seomos.cloud/sitemap.xml",
    host: "https://seomos.cloud",
  };
}
