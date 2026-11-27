import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { RolUsuario } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { leerFirma, type FirmaLeida } from "@/lib/storage";

export const runtime = "nodejs";

function error(mensaje: string, status: number) {
  return NextResponse.json({ error: mensaje }, { status });
}

// Visor de firma del titular de una inscripción (CONTEXT.md §6): sirve la imagen
// desde el propio servidor, leyendo el objeto del almacenamiento privado con las
// credenciales de la aplicación. Solo ADMINISTRADOR. El navegador nunca habla con
// el almacenamiento, así que el visor funciona con cualquier topología de red (el
// endpoint interno del contenedor no necesita ser alcanzable desde el cliente).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventoId: string; inscripcionId: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return error("No autenticado.", 401);
  }
  if (session.user.rol !== RolUsuario.ADMINISTRADOR) {
    return error("No autorizado.", 403);
  }

  const { eventoId, inscripcionId } = await params;

  const inscripcion = await prisma.inscripcion.findFirst({
    where: { id: inscripcionId, eventoId },
    select: { firmaUrl: true },
  });
  if (!inscripcion) {
    // Misma respuesta para evento inexistente e inscripción inexistente o de
    // otro evento, para no filtrar existencia (criterio de admin/reportes).
    return error("La inscripción no existe.", 404);
  }

  let firma: FirmaLeida | null = null;
  try {
    firma = await leerFirma(inscripcion.firmaUrl);
  } catch {
    return error("No se pudo abrir la firma. Inténtalo de nuevo.", 500);
  }
  if (!firma) {
    return error("La firma no está disponible.", 404);
  }

  return new NextResponse(Buffer.from(firma.bytes), {
    status: 200,
    headers: {
      "Content-Type": firma.contentType,
      "Content-Disposition": "inline",
      // Evidencia de una persona concreta: no debe quedar en cachés
      // intermedias. La vigencia la da la sesión exigida en cada solicitud.
      "Cache-Control": "private, no-store",
    },
  });
}