import { prisma } from "@/lib/prisma";
import { validarEventoParaInscripcion } from "@/lib/validations/inscripcion";
import { FormInscripcion } from "./form-inscripcion";

export default async function PaginaInscripcion({
  params,
}: {
  params: Promise<{ eventoId: string }>;
}) {
  const { eventoId } = await params;

  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    select: {
      id: true,
      nombre: true,
      lugar: true,
      cupoMaximo: true,
      cuposOcupados: true,
      maxAcompanantes: true,
      estado: true,
      inscripcionApertura: true,
      inscripcionCierre: true,
    },
  });

  if (!evento) {
    return <Mensaje titulo="Evento no encontrado" detalle="Verifica el enlace e inténtalo de nuevo." />;
  }

  const validacion = validarEventoParaInscripcion(evento);
  if (!validacion.ok) {
    const detalle =
      validacion.razon === "NO_ABIERTAS"
        ? "Las inscripciones para este evento no están abiertas en este momento."
        : "El periodo de inscripción para este evento aún no inicia o ya cerró.";
    return <Mensaje titulo="Inscripciones cerradas" detalle={detalle} />;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:py-10">
      <div className="hero-panel px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
          Bienestar al Aprendiz · SENA
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Inscripción</h1>
      </div>
      <FormInscripcion
        evento={{
          id: evento.id,
          nombre: evento.nombre,
          lugar: evento.lugar,
          cupoMaximo: evento.cupoMaximo,
          cuposOcupados: evento.cuposOcupados,
          maxAcompanantes: evento.maxAcompanantes,
        }}
      />
    </main>
  );
}

function Mensaje({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center px-4 py-16">
      <div className="w-full rounded-2xl border bg-card p-8 text-center shadow-xl">
        <h1 className="text-xl font-semibold">{titulo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{detalle}</p>
      </div>
    </main>
  );
}