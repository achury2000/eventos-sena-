import type { MetadataRoute } from "next";
import {
  PWA_COLOR,
  PWA_DESCRIPCION,
  PWA_NOMBRE,
  PWA_NOMBRE_CORTO,
} from "@/lib/pwa/constantes";

// Manifest de instalación (design.md, D8). Next lo publica en
// `/manifest.webmanifest`; el service worker lo precarga en `install`.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: PWA_NOMBRE,
    short_name: PWA_NOMBRE_CORTO,
    description: PWA_DESCRIPCION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "es",
    dir: "ltr",
    theme_color: PWA_COLOR,
    background_color: PWA_COLOR,
    categories: ["education", "productivity"],
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
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
