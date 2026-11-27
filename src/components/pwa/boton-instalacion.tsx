"use client";

import { useState } from "react";
import Image from "next/image";
import { Download } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { debeMostrarBotonInstalacion } from "@/lib/pwa/instalacion";
import {
  lanzarInstalacion,
  useEstadoInstalacion,
} from "./use-estado-instalacion";

const CLASE_BOTON =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/15 text-white/80 transition-colors outline-none hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand";

function obtenerInstrucciones({
  tienePrompt,
  ios,
  android,
}: {
  tienePrompt: boolean;
  ios: boolean;
  android: boolean;
}): string {
  if (tienePrompt) {
    return "Accede más rápido desde la pantalla de inicio.";
  }

  if (ios) {
    return "En Safari, toca Compartir y elige “Agregar a inicio”.";
  }

  if (android) {
    return "Abre el menú del navegador y elige “Instalar aplicación” o “Agregar a la pantalla de inicio”.";
  }

  return "Usa el icono de instalación de la barra de direcciones o el menú del navegador para instalar la app.";
}

/**
 * Entrada permanente a la instalación (design.md, D7). Vive en la franja
 * institucional, se oculta cuando la app ya está instalada o no hay mecanismo
 * y abre un diálogo con el prompt nativo o instrucciones verificables.
 */
export function BotonInstalacion() {
  const [abierto, setAbierto] = useState(false);
  const {
    installed,
    ios,
    android,
    tienePrompt,
    navegadorConInstalacion,
  } = useEstadoInstalacion();

  const mostrar = debeMostrarBotonInstalacion({
    standalone: installed,
    tienePrompt,
    esIOS: ios,
    navegadorConInstalacion,
  });

  if (!mostrar) return null;

  const instrucciones = obtenerInstrucciones({
    tienePrompt,
    ios,
    android,
  });

  async function instalar(): Promise<void> {
    await lanzarInstalacion();
    setAbierto(false);
  }

  return (
    <Dialog.Root open={abierto} onOpenChange={setAbierto}>
      <Dialog.Trigger
        type="button"
        aria-label="Instalar la aplicación"
        title="Instalar la aplicación"
        className={CLASE_BOTON}
      >
        <Download className="size-3.5" aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-background p-5 text-foreground shadow-xl outline-none">
          <div className="flex items-start gap-3">
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={40}
              height={40}
              unoptimized
              className="size-10 shrink-0 rounded-lg"
            />
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-semibold">
                Instala Eventos SENA
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {instrucciones}
              </Dialog.Description>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {tienePrompt ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  void instalar();
                }}
              >
                Instalar app
              </Button>
            ) : null}
            <Dialog.Close
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Ahora no
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
