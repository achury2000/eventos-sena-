// Proxy de Auth.js (antes "middleware" en Next.js). En Next.js 16 Middleware
// fue renombrado a Proxy y corre en el runtime de Node por defecto.
// Aquí SOLO se lee el JWT del cookie (validación optimista): nada de Prisma.
// Las validaciones que requieren base de datos van en cada route handler
// (ver CONTEXT.md, sección 6).
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const session = req.auth;
  const path = req.nextUrl.pathname;

  const isAdminRoute = path.startsWith("/admin");
  const isOperadorRoute = path.startsWith("/operador");

  // Zonas protegidas: sin sesión, a login. /cambiar-clave NO está aquí: es
  // pública a propósito (su enlace vive en el inicio de sesión) y su propia
  // Server Action exige correo + contraseña actual. La marca de cambio forzado
  // vive en la BD y tampoco se consulta aquí: el proxy es JWT-only por diseño.
  if (isAdminRoute || isOperadorRoute) {
    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", req.nextUrl));
    }
    // Cada rol solo entra a su zona.
    if (isAdminRoute && session.user.rol !== "ADMINISTRADOR") {
      return NextResponse.redirect(new URL("/operador", req.nextUrl));
    }
    if (isOperadorRoute && session.user.rol !== "OPERADOR") {
      return NextResponse.redirect(new URL("/admin", req.nextUrl));
    }
  }

  // Con sesión activa: /login y la raíz redirigen al home de su rol.
  if (session?.user && (path === "/login" || path === "/")) {
    const destino =
      session.user.rol === "ADMINISTRADOR" ? "/admin" : "/operador";
    return NextResponse.redirect(new URL(destino, req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Los assets de la PWA son públicos y no pasan por Auth.js: el navegador
  // necesita el manifest, los iconos y el service worker antes de tener sesión
  // (design.md, D9).
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/).*)",
  ],
};