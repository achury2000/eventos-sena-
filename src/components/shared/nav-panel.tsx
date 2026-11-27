"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

export interface ItemNavPanel {
  href: string;
  label: string;
  exacto?: boolean;
}

// Navegación en "píldoras" de vidrio pensada para el encabezado degradado de
// los paneles: la pestaña activa se rellena de blanco y el resto resalta al
// pasar el cursor.
export function NavPanel({ items }: { items: ItemNavPanel[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="flex flex-wrap items-center gap-1 rounded-full border border-white/20 bg-black/15 p-1 text-sm backdrop-blur"
    >
      {items.map((item) => {
        const activo = item.exacto
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "rounded-full px-3.5 py-1.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-white/60",
              activo
                ? "bg-white font-semibold text-brand-ink shadow-md"
                : "text-white/85 hover:bg-white/15 hover:text-white"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
