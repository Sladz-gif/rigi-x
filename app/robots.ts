import { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", siteConfig.adminBasePath],
    },
    sitemap: "https://rigi-x.com/sitemap.xml",
  };
}
