import { ActionForm } from "@/components/admin/action-form";
import { Button } from "@/components/ui/button";
import {
  desasignarAsistente,
  eliminarHabitacion,
} from "@/lib/actions/admin/habitaciones";
import { FormAsignarHabitacion } from "./form-asignar-habitacion";
import { BotonCopiar } from "./boton-copiar";
import { FormHabitacion, FormHabitacionEditar } from "./form-habitacion";

export type HabitacionConOcupantes = {
  id: string;
  identificador: string;
  capacidad: number;
  // Checkpoint de la habitación (cuarto como estación de control). En la
  // práctica siempre existe tras la migración/auto-provisionamiento; si
  // faltara, qrUrl/qrDataUrl son null y no se dibuja QR.
  checkpoint: { codigoQr: string } | null;
  qrUrl: string | null;
  qrDataUrl: string | null;
  _count: { asistentes: number };
  asistentes: {
    asistente: { id: string; nombreCompleto: string; documento: string };
  }[];
};

export function SeccionHabitaciones({
  eventoId,
  habitaciones,
}: {
  eventoId: string;
  habitaciones: HabitacionConOcupantes[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">Habitaciones</h3>
      <FormHabitacion eventoId={eventoId} />
      {habitaciones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Este evento aún no tiene habitaciones configuradas.
        </p>
      ) : (
        /* Sin overflow-hidden en el contenedor: recortaba los popovers
           absolutos de "Asignar"/"Editar" (se abren hacia abajo desde la
           última fila). El fondo del encabezado pasa a los <th> para
           conservar las esquinas redondeadas. */
        <div className="rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="rounded-tl-xl bg-muted/40 px-4 py-3 font-medium">
                  Identificador
                </th>
                <th className="bg-muted/40 px-4 py-3 font-medium">Capacidad</th>
                <th className="bg-muted/40 px-4 py-3 font-medium">Ocupación</th>
                <th className="bg-muted/40 px-4 py-3 font-medium">Ocupantes</th>
                <th className="bg-muted/40 px-4 py-3 font-medium">QR</th>
                <th className="rounded-tr-xl bg-muted/40 px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {habitaciones.map((h) => (
                <tr key={h.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{h.identificador}</td>
                  <td className="px-4 py-3">{h.capacidad}</td>
                  <td className="px-4 py-3">
                    <span className="tabular-nums">
                      {h._count.asistentes} / {h.capacidad}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {h.asistentes.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {h.asistentes.map(({ asistente }) => (
                          <li
                            key={asistente.id}
                            className="flex items-center justify-between gap-3"
                          >
                            <span>
                              <span className="font-medium">{asistente.nombreCompleto}</span>{" "}
                              <span className="text-muted-foreground">
                                — Doc. {asistente.documento}
                              </span>
                            </span>
                            <ActionForm
                              action={desasignarAsistente}
                              hidden={{
                                eventoId,
                                habitacionId: h.id,
                                asistenteId: asistente.id,
                              }}
                            >
                              <Button type="submit" variant="ghost" size="xs">
                                Quitar
                              </Button>
                            </ActionForm>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {h.qrUrl ? (
                      <div className="flex items-center justify-end gap-1">
                        <details className="relative">
                          <summary className="cursor-pointer rounded-lg px-2 py-1 text-xs hover:bg-muted">
                            Ver QR
                          </summary>
                          <div className="absolute right-0 top-full z-10 mt-1 flex flex-col items-start gap-1 rounded-xl border bg-background p-3 shadow-lg">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={h.qrDataUrl ?? undefined}
                              alt={`QR de la habitación ${h.identificador}`}
                              width={192}
                              height={192}
                              className="rounded-lg border"
                            />
                            <a
                              href={h.qrUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-muted-foreground underline"
                            >
                              {h.qrUrl}
                            </a>
                          </div>
                        </details>
                        <BotonCopiar texto={h.qrUrl} />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <details className="relative">
                        <summary className="cursor-pointer rounded-lg px-2 py-1 text-xs hover:bg-muted">
                          Asignar
                        </summary>
                        <div className="absolute right-0 top-full z-10 mt-1 w-96 rounded-xl border bg-background p-3 shadow-lg">
                          <FormAsignarHabitacion eventoId={eventoId} habitacionId={h.id} />
                        </div>
                      </details>
                      <details className="relative">
                        <summary className="cursor-pointer rounded-lg px-2 py-1 text-xs hover:bg-muted">
                          Editar
                        </summary>
                        <div className="absolute right-0 top-full z-10 mt-1 w-96 rounded-xl border bg-background p-3 shadow-lg">
                          <FormHabitacionEditar
                            eventoId={eventoId}
                            habitacion={{
                              id: h.id,
                              identificador: h.identificador,
                              capacidad: h.capacidad,
                            }}
                          />
                        </div>
                      </details>
                      <ActionForm
                        action={eliminarHabitacion}
                        hidden={{ id: h.id, eventoId }}
                        confirmText={`¿Eliminar la habitación "${h.identificador}"? Solo se puede eliminar si no tiene ocupantes.`}
                      >
                        <Button type="submit" variant="destructive" size="sm">
                          Eliminar
                        </Button>
                      </ActionForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}