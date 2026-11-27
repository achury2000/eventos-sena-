import { cn } from "cn";
import {
  ETIQUETA_ESTADO,
  type EstadoEventoString,
} from "@/lib/labels";

const ESTILOS: Record<EstadoEventoString, string> = {
  PLANEADO: "border-border bg-muted text-muted-foreground",
  INSCRIPCIONES_ABIERTAS:
    "border-success/40 bg-success/10 text-success-foreground",
  CERRADO: "border-warning/40 bg-warning/10 text-warning-foreground",
  FINALIZADO: "border-border bg-secondary text-secondary-foreground",
  CANCELADO: "border-destructive/40 bg-destructive/10 text-destructive",
};

const PUNTOS: Record<EstadoEventoString, string> = {
  PLANEADO: "bg-muted-foreground",
  INSCRIPCIONES_ABIERTAS: "bg-success",
  CERRADO: "bg-warning",
  FINALIZADO: "bg-secondary-foreground",
  CANCELADO: "bg-destructive",
};

export function EstadoBadge({
  estado,
  className,
}: {
  estado: EstadoEventoString;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        ESTILOS[estado],
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          PUNTOS[estado],
          // Solo "abiertas" late: indica que el evento está recibiendo gente.
          estado === "INSCRIPCIONES_ABIERTAS" && "punto-pulso"
        )}
      />
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}
