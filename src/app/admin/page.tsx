import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { BarraProgreso } from "@/components/shared/barra-progreso";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { TarjetaKpi } from "@/components/shared/tarjeta-kpi";
import { requireAdmin } from "@/lib/actions/admin/guard";
import { formatearFecha } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

const FORMATO_DIA = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// Rango legible para la lista: si el evento dura un solo día no repite la
// fecha. Es solo presentación; las fechas se siguen tomando de la consulta.
function formatearRango(inicio: Date, fin: Date): string {
  const diaInicio = FORMATO_DIA.format(inicio);
  const diaFin = FORMATO_DIA.format(fin);
  return diaInicio === diaFin ? diaInicio : `${diaInicio} — ${diaFin}`;
}

export default async function AdminDashboard() {
  const session = await requireAdmin();

  const [eventos, totalOperadores, totalAdmin, totalCheckpoints] = await Promise.all([
    prisma.evento.findMany({
      include: { _count: { select: { inscripciones: true } } },
      orderBy: { creadoEn: "desc" },
      take: 5,
    }),
    prisma.usuario.count({ where: { rol: "OPERADOR" } }),
    prisma.usuario.count({ where: { rol: "ADMINISTRADOR" } }),
    prisma.checkpoint.count(),
  ]);

  const eventosActivos = eventos.filter((e) => e.estado === "INSCRIPCIONES_ABIERTAS").length;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Bienvenido, {session.user.nombreCompleto}.
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Gestiona los eventos del Bienestar al Aprendiz, sus checkpoints y
            los operadores asignados.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/eventos"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Ver todos los eventos
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link
            href="/admin/eventos/nuevo"
            className={buttonVariants({ size: "sm" })}
          >
            <CalendarPlus aria-hidden="true" />
            Crear evento
          </Link>
        </div>
      </div>

      <div className="cascada grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TarjetaKpi
          label="Eventos recientes"
          valor={eventos.length}
          detalle={`${eventosActivos} con inscripciones abiertas`}
          icono={CalendarDays}
          href="/admin/eventos"
        />
        <TarjetaKpi
          label="Usuarios"
          valor={totalOperadores + totalAdmin}
          detalle={`${totalOperadores} operadores · ${totalAdmin} administradores`}
          icono={Users}
          href="/admin/cuentas"
        />
        <TarjetaKpi
          label="Checkpoints"
          valor={totalCheckpoints}
          detalle="Configurados en todos los eventos"
          icono={ClipboardList}
          className="sm:col-span-2 lg:col-span-1"
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">
              Eventos recientes
            </h3>
            <p className="text-xs text-muted-foreground">
              Los eventos creados más recientemente.
            </p>
          </div>
          <Link
            href="/admin/eventos"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Ver listado completo
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>

        {eventos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <CalendarDays className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-medium">Aún no hay eventos</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crea el primer evento para comenzar a gestionar inscripciones y
                checkpoints.
              </p>
            </div>
            <Link
              href="/admin/eventos/nuevo"
              className={buttonVariants({ size: "sm" })}
            >
              <CalendarPlus aria-hidden="true" />
              Crear evento
            </Link>
          </div>
        ) : (
          <ul className="cascada flex flex-col gap-3">
            {eventos.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/admin/eventos/${e.id}`}
                  className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border bg-card p-4 pl-5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-1.5 bg-linear-to-b from-brand via-primary to-cyan transition-all duration-300 group-hover:w-2.5"
                  />
                  <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        title={e.nombre}
                        className="min-w-0 truncate font-medium group-hover:text-primary"
                      >
                        {e.nombre}
                      </span>
                      <EstadoBadge estado={e.estado} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        {formatearRango(e.fechaInicio, e.fechaFin)}
                      </span>
                      <span>{e._count.inscripciones} inscripciones</span>
                      <span className="hidden sm:inline">
                        Inicio: {formatearFecha(e.fechaInicio)}
                      </span>
                    </div>
                  </div>
                  <BarraProgreso
                    valor={e.cuposOcupados}
                    maximo={e.cupoMaximo}
                    etiqueta="Cupo ocupado"
                    ariaLabel={`Cupo ocupado de ${e.nombre}`}
                    className="sm:w-56 sm:shrink-0"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
