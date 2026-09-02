import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AstroCoach",
    short_name: "AstroCoach",
    description: "A calm, reflective space for exploring your lived experience.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fafaff",
    theme_color: "#6d28d9",
    categories: ["lifestyle", "health"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
