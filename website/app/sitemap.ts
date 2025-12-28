import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://odavlguardian.vercel.app";
  const lastModified = new Date();

  const routes = ["/", "/docs", "/privacy", "/terms", "/run", "/report/sample"];

  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified,
    changefreq: "weekly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
