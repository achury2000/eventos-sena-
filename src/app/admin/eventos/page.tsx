import Link from "next/link";
import { ActionForm } from "@/components/admin/action-form";
import { Button } from "@/components/ui/button";
import { eliminarEvento } from "@/lib/actions/admin/eventos";
import { requireAdmin } from "@/lib/actions/admin/guard";
import { ETIQUETA_ESTADO, formatearFecha } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function EventosPage() {
  await requireAdmin();

  const eventos = await prisma.evento.findMany({
    include: { _count: { select: { inscripciones: true } } },
    orderBy: { creadoEn: "desc" },
  });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Eventos del Bienestar al Aprendiz. Cuentan personas totales (titulares + acompañantes).
        </p>
        <Link href="/admin/eventos/nuevo">
          <Button>Crear Evento</Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Evento</th>
              <th className="px-4 py-3 font-medium">Lugar</th>
              <th className="px-4 py-3 font-medium">Fechas</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Cupo</th>
              <th className="px-4 py-3 font-medium">Inscripciones</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {eventos.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Aún no hay eventos. Crea el primero.
                </td>
              </tr>
            ) : (
              eventos.map((e) => (
                <tr key={e.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/eventos/${e.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {e.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{e.lugar}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatearFecha(e.fechaInicio)} — {formatearFecha(e.fechaFin)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border px-2 py-0.5 text-xs">
                      {ETIQUETA_ESTADO[e.estado]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {e.cuposOcupados} / {e.cupoMaximo}
                  </td>
                  <td className="px-4 py-3">{e._count.inscripciones}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <ActionForm
                        action={eliminarEvento}
                        hidden={{ id: e.id }}
                        confirmText="¿Eliminar este evento? Solo eventos sin inscripciones pueden eliminarse."
                      >
                        <Button type="submit" variant="destructive" size="sm">
                          Eliminar
                        </Button>
                      </ActionForm>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}