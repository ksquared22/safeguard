import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"
  return [
    {
      url: base,
      changeFrequency: "weekly",
      priority: 1.0
    }
  ]
}
