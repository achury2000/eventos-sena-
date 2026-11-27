import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";
import { NumeroAnimado } from "./numero-animado";

interface TarjetaKpiProps {
  label: string;
  valor: number;
  detalle: string;
  icono: LucideIcon;
  href?: string;
  className?: string;
}

// Tarjeta de indicador del panel. Si tiene destino se renderiza como enlace,
// con foco visible y hover coherentes con el resto de la interfaz.
export function TarjetaKpi({
  label,
  valor,
  detalle,
  icono: Icono,
  href,
  className,
}: TarjetaKpiProps) {
  const contenido = (
    <>
      {/* Resplandor de esquina: crece al pasar el cursor por la tarjeta. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-linear-to-br from-primary/25 via-cyan/20 to-transparent blur-2xl transition-transform duration-500 group-hover/kpi:scale-150"
      />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-brand to-primary text-white shadow-md shadow-primary/30 transition-transform duration-500 group-hover/kpi:-rotate-6 group-hover/kpi:scale-110">
          <Icono className="size-5" aria-hidden="true" />
        </span>
      </div>
      <div className="relative">
        <p className="text-4xl font-bold leading-none tracking-tight tabular-nums">
          <NumeroAnimado valor={valor} />
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {detalle}
        </p>
      </div>
    </>
  );

  const clases = cn(
    "group/kpi relative flex flex-col justify-between gap-5 overflow-hidden rounded-2xl border bg-card p-5",
    href &&
      "hover:border-primary/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
    className
  );

  if (href) {
    return (
      <Link href={href} className={clases}>
        {contenido}
      </Link>
    );
  }

  return <div className={clases}>{contenido}</div>;
}
