import { prisma } from "@/lib/prisma";

// Consulta de la marca de contraseña temporal (spec `plataforma/gestion-claves`).
// Los layouts de panel la usan para condicionar el acceso: el proxy no consulta
// la BD por diseño (solo valida el JWT), así que la redirección a
// /cambiar-clave vive en el layout (design.md, D1). Extraerla aquí la hace
// testeable sin montar un layout completo.
export async function debeCambiarClave(usuarioId: string): Promise<boolean> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { debeCambiarClave: true },
  });
  // Cuenta inexistente (sesión huérfana): sin marca no hay bloqueo; el proxy
  // y las acciones ya manejan ese caso por su lado.
  return usuario?.debeCambiarClave ?? false;
}
