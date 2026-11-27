import type { NextConfig } from "next";

const esProduccion = process.env.NODE_ENV === "production";

/**
 * CSP estática, sin nonce. Es deliberada: los nonces obligan a renderizar cada
 * página dinámicamente y desactivan la optimización estática, el ISR y el CDN
 * (guía de CSP de Next 16), y `CONTEXT.md` §4 exige que el modo offline
 * cachee el app shell — un shell precisamente estático. Ver design.md, D4.
 *
 * La contrapartida asumida es `'unsafe-inline'` en `script-src` y `style-src`:
 * es una protección parcial contra XSS, no una CSP estricta. Si el service
 * worker del change de PWA termina sirviendo el JS con hashes SRI, esto se
 * puede endurecer sin perder el modo offline.
 *
 * `img-src` y `font-src` permiten `data:` porque el estado de la sesión y los
 * QR se renderizan en el cliente; `blob:` porque las vistas previas de firma se
 * dibujan desde un object URL.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (esProduccion ? "" : " 'unsafe-eval'"),
  // Solo se puede registrar un service worker servido por el propio origen
  // (design.md, D9). Sin esta directiva heredaría de script-src.
  "worker-src 'self'",
  // Los estilos inline de Tailwind/shadcn y el canvas de firma no son
  // negociables en esta app.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  // Ningún tipo de contenido embebido: nada de <object>/<embed>.
  "object-src 'none'",
  // La página no puede declararse otra base URI: cierra la vía de
  // redireccionar todos los enlaces relativos a un origen atacante.
  "base-uri 'self'",
  // Un formulario no puede enviarse a otro dominio: sin esto, un XSS podría
  // mandar datos personales (documento, firma) a un collector externo.
  "form-action 'self'",
  // Prohibe embeber la app en un iframe: es la defensa de clickjacking que
  // protege la pantalla de login.
  "frame-ancestors 'none'",
  // Solo en producción: en `http://localhost` esto rompería la app.
  ...(esProduccion ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  // Nodemailer usa APIs nativas de Node y no debe empaquetarse en el bundle
  // del servidor; Next lo deja como dependencia externa (design.md, D5).
  serverExternalPackages: ["nodemailer"],
  // No anunciar en cada respuesta qué framework corre detrás.
  poweredByHeader: false,
  async redirects() {
    // La gestión de operadores se unificó en la sección Cuentas (2026-10-12):
    // cualquier enlace viejo o marcado debe caer en la pestaña Operadores.
    return [
      {
        source: "/admin/operadores",
        destination: "/admin/cuentas?rol=OPERADOR",
        permanent: true,
      },
    ];
  },
  async headers() {
    const comunes = [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      {
        key: "Referrer-Policy",
        // Mandar solo el origen al navegar a terceros: las URLs internas
        // llegan a ser identificadores de evento y de checkpoint.
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        // La app no usa cámara, micrófono ni geolocalización en ningún flujo.
        value: "camera=(), microphone=(), geolocation=()",
      },
      // En desarrollo se omite a propósito: el navegador lo ignoraría sobre
      // `http://localhost` de todos modos, pero dejarlo explícito evita que
      // alguien lo lea como "ya está aplicado" en un entorno que no lo tiene.
      ...(esProduccion
        ? [
            {
              key: "Strict-Transport-Security",
              value: "max-age=63072000; includeSubDomains",
            },
          ]
        : []),
    ];

    return [
      {
        // El navegador debe comprobar siempre si hay una versión nueva del
        // script; una copia HTTP vieja retrasaría la actualización automática.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      { source: "/:path*", headers: comunes },
    ];
  },
};

export default nextConfig;
