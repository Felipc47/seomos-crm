import type { MetadataRoute } from "next";

const baseUrl = "https://seomos.cloud";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${baseUrl}/`,
      lastModified: "2026-08-17",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: "2026-08-17",
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: "2026-08-17",
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
