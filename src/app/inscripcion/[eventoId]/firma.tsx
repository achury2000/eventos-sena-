"use client";

import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";

export function Firma({ onCambio }: { onCambio: (dataUrl: string | null) => void }) {
  const ref = useRef<SignatureCanvas>(null);

  function alLimpiar() {
    ref.current?.clear();
    onCambio(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg border bg-white">
        <SignatureCanvas
          ref={ref}
          backgroundColor="white"
          canvasProps={{ className: "h-40 w-full" }}
          onEnd={() => onCambio(ref.current?.toDataURL("image/png") ?? null)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={alLimpiar}>
          Limpiar
        </Button>
      </div>
    </div>
  );
}