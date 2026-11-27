import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonCancelar } from "@/components/admin/boton-cancelar-inscripcion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/actions/admin/guard";
import { formatearFecha } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

const ETIQUETA_ESTADO_INSCRIPCION: Record<string, string> = {
  INSCRITO: "Inscrito",
  CONFIRMADO: "Confirmado",
  NO_ASISTIO: "No asistió",
  CANCELADO: "Cancelado",
};

const PAGINA_TAMANO = 20;
const MAX_LARGO_BUSQUEDA = 100;

type SearchParams = {
  q?: string | string[];
  pagina?: string | string[];
};

function valorTexto(valor: string | string[] | undefined): string {
  if (Array.isArray(valor)) valor = valor[0];
  return valor?.trim().slice(0, MAX_LARGO_BUSQUEDA) ?? "";
}

function valorPagina(valor: string | string[] | undefined): number {
  const crudo = Array.isArray(valor) ? valor[0] : valor;
  const n = Number.parseInt(crudo ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export default async function InscripcionesEventoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();

  const { id } = await params;
  const evento = await prisma.evento.findUnique({
    where: { id },
    select: { id: true, nombre: true },
  });

  if (!evento) {
    notFound();
  }

  const sp = await searchParams;
  const q = valorTexto(sp.q);
  const pagina = valorPagina(sp.pagina);

  const where = {
    eventoId: evento.id,
    ...(q
      ? {
          OR: [
            { correo: { contains: q, mode: "insensitive" as const } },
            {
              asistentes: {
                some: {
                  OR: [
                    { nombreCompleto: { contains: q, mode: "insensitive" as const } },
                    { documento: { contains: q } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const [totalEvento, totalFiltrado] = await Promise.all([
    prisma.inscripcion.count({ where: { eventoId: evento.id } }),
    q ? prisma.inscripcion.count({ where }) : Promise.resolve(0),
  ]);
  const total = q ? totalFiltrado : totalEvento;

  const totalPaginas = Math.max(1, Math.ceil(total / PAGINA_TAMANO));
  const paginaActual = Math.min(pagina, totalPaginas);
  const skip = (paginaActual - 1) * PAGINA_TAMANO;

  const inscripciones = await prisma.inscripcion.findMany({
    where,
    orderBy: { fechaInscripcion: "desc" },
    skip,
    take: PAGINA_TAMANO,
    include: {
      asistentes: {
        orderBy: [{ esTitular: "desc" }, { creadoEn: "asc" }],
        select: {
          nombreCompleto: true,
          documento: true,
          esTitular: true,
        },
      },
    },
  });

  const base = `/admin/eventos/${evento.id}/inscripciones`;

  function urlPagina(n: number): string {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (n > 1) usp.set("pagina", String(n));
    const sufijo = usp.toString();
    return sufijo ? `${base}?${sufijo}` : base;
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Inscripciones
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">{evento.nombre}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {q
              ? `${total} resultado(s) para “${q}”`
              : `${total} inscripción(es) en total`}
            {total > 0
              ? ` · mostrando ${skip + 1}–${skip + inscripciones.length} de ${total}`
              : ""}
          </p>
        </div>
        <form method="GET" action={base} className="flex items-center gap-2">
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre, documento o correo"
            className="w-64"
          />
          <Button type="submit" variant="outline" size="sm">
            Buscar
          </Button>
        </form>
      </div>

      {totalEvento === 0 ? (
        <p className="text-sm text-muted-foreground">
          Este evento aún no tiene inscripciones públicas.
        </p>
      ) : total === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay inscripciones que coincidan con “{q}”.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Titular</th>
                <th className="px-4 py-3 font-medium">Acompañantes</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Correo</th>
                <th className="px-4 py-3 font-medium">Fecha de inscripción</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {inscripciones.map((ins) => {
                const titular = ins.asistentes.find((a) => a.esTitular);
                const acompanantes = ins.asistentes.filter((a) => !a.esTitular);
                return (
                  <tr key={ins.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium">
                        {titular?.nombreCompleto ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {titular ? `Doc. ${titular.documento}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {acompanantes.length === 0 ? (
                        <span className="text-muted-foreground">
                          Sin acompañantes
                        </span>
                      ) : (
                        <ul className="space-y-1">
                          {acompanantes.map((acompanante) => (
                            <li key={acompanante.documento}>
                              <div className="font-medium">
                                {acompanante.nombreCompleto}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Doc. {acompanante.documento}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {ins.asistentes.length}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {ins.correo ? (
                        <a
                          href={`mailto:${ins.correo}`}
                          className="text-primary hover:underline"
                        >
                          {ins.correo}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {formatearFecha(ins.fechaInscripcion)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={
                          ins.estado === "CANCELADO"
                            ? "rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs text-destructive"
                            : "rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-xs text-success-foreground"
                        }
                      >
                        {ETIQUETA_ESTADO_INSCRIPCION[ins.estado] ?? ins.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/api/admin/eventos/${evento.id}/inscripciones/${ins.id}/firma`}
                          target="_blank"
                          rel="noopener noreferrer"
                          // El enlace apunta a un route handler: precargarlo
                          // dispararía una lectura del bucket por fila visible.
                          prefetch={false}
                        >
                          <Button variant="outline" size="sm">
                            Ver firma
                          </Button>
                        </Link>
                        {ins.estado !== "CANCELADO" ? (
                          <BotonCancelar inscripcionId={ins.id} />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && totalPaginas > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Página {paginaActual} de {totalPaginas}
          </p>
          <div className="flex items-center gap-2">
            {paginaActual > 1 ? (
              <Link href={urlPagina(paginaActual - 1)}>
                <Button variant="outline" size="sm">
                  Anterior
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Anterior
              </Button>
            )}
            {paginaActual < totalPaginas ? (
              <Link href={urlPagina(paginaActual + 1)}>
                <Button variant="outline" size="sm">
                  Siguiente
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Siguiente
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <Link href={`/admin/eventos/${evento.id}`}>
        <Button variant="outline" size="sm">
          Volver al evento
        </Button>
      </Link>
    </section>
  );
}