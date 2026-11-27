import Image from "next/image";
import { BotonInstalacion } from "@/components/pwa/boton-instalacion";
import { SelectorTema } from "@/components/tema/selector-tema";

// Franja institucional SENA: barra superior global montada en el root layout.
// El logo oficial fue recalcado con sus verdes al tono exacto de la barra
// (#25A200) para que la imagen se mimetice con el color institucional.
// Se sirve sin optimizador (unoptimized) para que el tono sea pixel-exacto.
//
// El rediseño solo añade movimiento: la barra conserva su color sólido y las
// formas decorativas empiezan después del logo (máscara en `.franja-brillo`),
// así el logo nunca se pinta sobre un fondo distinto al suyo.
export function FranjaInstitucional() {
  return (
    <header className="franja-sena bg-brand text-brand-foreground print:hidden">
      <div aria-hidden="true" className="franja-brillo">
        <i />
        <i />
        <i />
      </div>
      <div className="relative flex w-full items-center gap-3 px-4 py-1.5">
        <Image
          src="/logo-sena.png"
          alt="SENA"
          width={225}
          height={225}
          priority
          unoptimized
          className="franja-logo h-11 w-11 shrink-0"
        />
        <span aria-hidden="true" className="h-6 w-px bg-brand-foreground/60" />
        <span className="min-w-0 truncate text-sm font-semibold tracking-wide sm:text-base">
          Eventos Sena
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <BotonInstalacion />
          <SelectorTema />
        </div>
      </div>
      <div aria-hidden="true" className="franja-linea" />
    </header>
  );
}
