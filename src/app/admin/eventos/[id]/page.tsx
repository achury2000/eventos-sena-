import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ActionForm } from "@/components/admin/action-form";
import { Button } from "@/components/ui/button";
import {
  cambiarEstadoEvento,
  eliminarEvento,
} from "@/lib/actions/admin/eventos";
import { eliminarCheckpoint } from "@/lib/actions/admin/checkpoints";
import { desasignarOperador } from "@/lib/actions/admin/evento-operadores";
import { requireAdmin } from "@/lib/actions/admin/guard";
import {
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO_CHECKPOINT,
  formatearFecha,
} from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { estadosSiguientes } from "@/lib/validations/admin";
import { FormAsignarOperador } from "./form-asignar-operador";
import { BotonCopiar } from "./boton-copiar";
import { FormCheckpoint, FormCheckpointEditar } from "./form-checkpoint";
import { SeccionHabitaciones } from "./seccion-habitaciones";

export default async function DetalleEventoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  const evento = await prisma.evento.findUnique({
    where: { id },
    include: {
      checkpoints: {
        where: { habitacionId: null },
        include: { _count: { select: { registros: true } } },
        orderBy: { creadoEn: "asc" },
      },
      operadores: {
        include: { operador: true },
      },
      habitaciones: {
        include: {
          _count: { select: { asistentes: true } },
          // El checkpoint del cuarto expone el codigoQr que codifica su QR
          // de estación (habitación = checkpoint ALOJAMIENTO).
          checkpoint: { select: { codigoQr: true } },
          asistentes: {
            include: {
              asistente: {
                select: { id: true, nombreCompleto: true, documento: true },
              },
            },
          },
        },
        orderBy: { identificador: "asc" },
      },
    },
  });

  if (!evento) {
    notFound();
  }

  const urlBase = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";
  const checkpointsConQr = await Promise.all(
    evento.checkpoints.map(async (cp) => {
      const qrUrl = `${urlBase.replace(/\/$/, "")}/checkpoint/${cp.codigoQr}`;
      const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 256, margin: 1 });
      return { ...cp, qrUrl, qrDataUrl };
    })
  );

  // QR de estación por cuarto: omite el QR si la habitación no tuviera
  // checkpoint (estado legacy defendido; el checkpoint se auto-provisiona).
  const habitacionesConQr = await Promise.all(
    evento.habitaciones.map(async (h) => {
      if (!h.checkpoint) return { ...h, qrUrl: null, qrDataUrl: null };
      const qrUrl = `${urlBase.replace(/\/$/, "")}/checkpoint/${h.checkpoint.codigoQr}`;
      const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 256, margin: 1 });
      return { ...h, qrUrl, qrDataUrl };
    })
  );

  const inscripcionUrl = `${urlBase.replace(/\/$/, "")}/inscripcion/${evento.id}`;
  const inscripcionQrDataUrl = await QRCode.toDataURL(inscripcionUrl, {
    width: 256,
    margin: 1,
  });

  const asignadosIds = evento.operadores.map((o) => o.operadorId);
  const operadoresDisponibles = await prisma.usuario.findMany({
    where: { rol: "OPERADOR", id: { notIn: asignadosIds } },
    orderBy: { nombreCompleto: "asc" },
  });

  const transiciones = estadosSiguientes(evento.estado);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Evento</p>
          <h2 className="text-2xl font-semibold tracking-tight">{evento.nombre}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="rounded-full border px-2 py-0.5 text-xs">
              {ETIQUETA_ESTADO[evento.estado]}
            </span>{" "}
            · {evento.lugar} · {formatearFecha(evento.fechaInicio)} — {formatearFecha(evento.fechaFin)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/eventos/${id}/inscripciones`}>
            <Button variant="outline" size="sm">
              Inscripciones
            </Button>
          </Link>
          <Link href={`/admin/eventos/${id}/reporte`}>
            <Button variant="outline" size="sm">
              Reporte
            </Button>
          </Link>
          <Link href={`/admin/eventos/${id}/editar`}>
            <Button variant="outline" size="sm">
              Editar
            </Button>
          </Link>
          <ActionForm
            action={eliminarEvento}
            hidden={{ id }}
            confirmText="¿Eliminar este evento? Solo se puede eliminar si no tiene inscripciones."
          >
            <Button type="submit" variant="destructive" size="sm">
              Eliminar
            </Button>
          </ActionForm>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border bg-card p-4 sm:grid-cols-4">
        <Dato label="Cupo" valor={`${evento.cuposOcupados} / ${evento.cupoMaximo}`} />
        <Dato
          label="Acompañantes"
          valor={
            evento.maxAcompanantes === 0
              ? "No (inscripción individual)"
              : `Hasta ${evento.maxAcompanantes} por inscripción`
          }
        />
        <Dato label="Inscripciones abren" valor={formatearFecha(evento.inscripcionApertura)} />
        <Dato label="Inscripciones cierran" valor={formatearFecha(evento.inscripcionCierre)} />
        <Dato
          label="Extras"
          valor={[
            evento.incluyeHotel ? "Hotel" : null,
            evento.incluyeBus ? "Bus" : null,
          ].filter(Boolean).join(" + ") || "Ninguno"}
        />
        {evento.descripcion ? (
          <div className="col-span-2">
            <Dato label="Descripción" valor={evento.descripcion} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Enlace de inscripción
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg border bg-muted/40 px-2.5 py-1.5 text-sm">
            {inscripcionUrl}
          </code>
          <BotonCopiar texto={inscripcionUrl} />
          <details className="relative">
            <summary className="cursor-pointer text-xs hover:underline">Ver QR</summary>
            <div className="absolute left-0 top-full z-10 mt-1 flex flex-col items-start gap-1 rounded-xl border bg-background p-3 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={inscripcionQrDataUrl}
                alt="QR del enlace de inscripción del evento"
                width={192}
                height={192}
                className="rounded-lg border"
              />
              <a
                href={inscripcionUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground underline"
              >
                {inscripcionUrl}
              </a>
            </div>
          </details>
        </div>
      </div>

      {transiciones.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4">
          <span className="text-sm font-medium">Cambiar estado:</span>
          {transiciones.map((siguiente) => (
            <ActionForm
              key={siguiente}
              action={cambiarEstadoEvento}
              hidden={{ id, estadoNuevo: siguiente }}
            >
              <Button type="submit" variant="secondary" size="sm">
                Marcar como {ETIQUETA_ESTADO[siguiente].toLowerCase()}
              </Button>
            </ActionForm>
          ))}
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Checkpoints</h3>
        <FormCheckpoint eventoId={evento.id} />
        {evento.checkpoints.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este evento aún no tiene checkpoints configurados.
          </p>
        ) : (
          /* Sin overflow-hidden: recortaba los popovers de "Ver QR"/"Editar"
             en la última fila. El fondo del encabezado pasa a los <th> para
             conservar las esquinas redondeadas. */
          <div className="rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="rounded-tl-xl bg-muted/40 px-4 py-3 font-medium">
                    Checkpoint
                  </th>
                  <th className="bg-muted/40 px-4 py-3 font-medium">Categoría</th>
                  <th className="bg-muted/40 px-4 py-3 font-medium">Estado</th>
                  <th className="bg-muted/40 px-4 py-3 font-medium">Registros</th>
                  <th className="bg-muted/40 px-4 py-3 font-medium">QR</th>
                  <th className="rounded-tr-xl bg-muted/40 px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {checkpointsConQr.map((cp) => (
                  <tr key={cp.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{cp.nombre}</td>
                    <td className="px-4 py-3">{ETIQUETA_TIPO_CHECKPOINT[cp.tipo]}</td>
                    <td className="px-4 py-3">
                      {cp.activo ? (
                        <span className="rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-xs text-success-foreground">
                          Activo
                        </span>
                      ) : (
                        <span className="rounded-full border border-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{cp._count.registros}</td>
                    <td className="px-4 py-3">
                      <details className="relative">
                        <summary className="cursor-pointer text-xs hover:underline">
                          Ver QR
                        </summary>
                        <div className="absolute left-0 top-full z-10 mt-1 flex flex-col items-start gap-1 rounded-xl border bg-background p-3 shadow-lg">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cp.qrDataUrl}
                            alt={`QR del checkpoint ${cp.nombre}`}
                            width={192}
                            height={192}
                            className="rounded-lg border"
                          />
                          <a
                            href={cp.qrUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-muted-foreground underline"
                          >
                            {cp.qrUrl}
                          </a>
                        </div>
                      </details>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <details className="relative">
                          <summary className="cursor-pointer rounded-lg px-2 py-1 text-xs hover:bg-muted">
                            Editar
                          </summary>
                          <div className="absolute right-0 top-full z-10 mt-1 w-96 rounded-xl border bg-background p-3 shadow-lg">
                            <FormCheckpointEditar
                              eventoId={evento.id}
                              checkpoint={{ id: cp.id, nombre: cp.nombre, tipo: cp.tipo }}
                            />
                          </div>
                        </details>
                        <ActionForm
                          action={eliminarCheckpoint}
                          hidden={{ id: cp.id, eventoId: evento.id }}
                          confirmText={`¿Eliminar el checkpoint "${cp.nombre}" y sus registros de control?`}
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

      {evento.incluyeHotel ? (
        <SeccionHabitaciones eventoId={evento.id} habitaciones={habitacionesConQr} />
      ) : null}

      <section className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Operadores asignados</h3>
        {evento.operadores.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay operadores asignados a este evento.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {evento.operadores.map((eo) => (
              <li
                key={eo.operadorId}
                className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium">{eo.operador.nombreCompleto}</span>{" "}
                  <span className="text-muted-foreground">— {eo.operador.email}</span>
                </div>
                <ActionForm
                  action={desasignarOperador}
                  hidden={{ eventoId: evento.id, operadorId: eo.operadorId }}
                  confirmText="¿Quitar este Operador del evento?"
                >
                  <Button type="submit" variant="ghost" size="sm">
                    Quitar
                  </Button>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
        <div className="rounded-xl border bg-card p-4">
          <FormAsignarOperador
            eventoId={evento.id}
            operadores={operadoresDisponibles}
          />
        </div>
      </section>
    </section>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{valor}</p>
    </div>
  );
}