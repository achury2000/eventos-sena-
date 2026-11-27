import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";
import { FondoAnimado } from "@/components/shared/fondo-animado";
import { FranjaInstitucional } from "@/components/shared/franja-institucional";
import { AvisoConectividad } from "@/components/pwa/aviso-conectividad";
import { GuardaEscriturasSinConexion } from "@/components/pwa/guarda-escrituras";
import { RegistradorPwa } from "@/components/pwa/registrador-pwa";
import { ProveedorTema } from "@/components/tema/proveedor-tema";
import { PWA_COLOR, PWA_NOMBRE_CORTO } from "@/lib/pwa/constantes";
import { CAPTURA_PROMPT_INSTALACION_SCRIPT } from "@/lib/pwa/instalacion";
import { TEMA_SCRIPT } from "@/lib/tema";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Eventos SENA",
    template: "%s | Eventos SENA",
  },
  description:
    "Plataforma de gestión de eventos y control de asistencia del SENA",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: PWA_NOMBRE_CORTO,
  },
};

export const viewport: Viewport = {
  themeColor: PWA_COLOR,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      data-theme="light"
      suppressHydrationWarning
      className={`${openSans.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_SCRIPT }} />
        <script
          dangerouslySetInnerHTML={{
            __html: CAPTURA_PROMPT_INSTALACION_SCRIPT,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <ProveedorTema>
          <FondoAnimado />
          <FranjaInstitucional />
          <GuardaEscriturasSinConexion />
          <AvisoConectividad />
          <RegistradorPwa />
          {children}
        </ProveedorTema>
      </body>
    </html>
  );
}
