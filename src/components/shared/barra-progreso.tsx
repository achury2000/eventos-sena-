import type { ReactNode } from "react";
import { cn } from "cn";

interface BarraProgresoProps {
  valor: number;
  maximo: number;
  etiqueta: string;
  ariaLabel?: string;
  detalle?: ReactNode;
  className?: string;
}

// Barra de avance reutilizable para cupos y registros. El texto exacto del
// detalle lo decide quien la usa, para no alterar los contadores ni los
// selectores de las pruebas E2E.
export function BarraProgreso({
  valor,
  maximo,
  etiqueta,
  ariaLabel,
  detalle,
  className,
}: BarraProgresoProps) {
  const porcentaje = maximo > 0 ? Math.min(100, Math.round((valor / maximo) * 100)) : 0;
  const valorAria = maximo > 0 ? Math.min(Math.max(valor, 0), maximo) : 0;
  const maximoAria = maximo > 0 ? maximo : 1;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-xs">
        <span className="min-w-0 text-muted-foreground">{etiqueta}</span>
        <span className="min-w-0 text-right font-medium tabular-nums text-foreground">
          {detalle ?? `${valor}/${maximo} · ${porcentaje}%`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={ariaLabel ?? etiqueta}
        aria-valuemin={0}
        aria-valuemax={maximoAria}
        aria-valuenow={valorAria}
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted shadow-inner"
      >
        <div
          // Cupo casi lleno: el relleno pasa a ámbar para llamar la atención.
          data-nivel={porcentaje >= 90 ? "alto" : undefined}
          className="barra-relleno h-full origin-left rounded-full transition-[width] duration-700 motion-reduce:transition-none"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}
