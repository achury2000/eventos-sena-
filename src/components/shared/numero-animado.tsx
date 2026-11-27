"use client";

import { useEffect, useRef, useState } from "react";

// Cuenta desde 0 hasta el valor al aparecer. Desde el servidor se pinta el
// valor final (sin parpadeo ni contenido vacío si falla JavaScript); en el
// cliente la animación solo corre una vez y se omite con "reducir movimiento".
export function NumeroAnimado({
  valor,
  duracion = 900,
}: {
  valor: number;
  duracion?: number;
}) {
  const [mostrado, setMostrado] = useState(valor);
  const primera = useRef(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !primera.current || valor === 0) {
      primera.current = false;
      setMostrado(valor);
      return;
    }
    primera.current = false;

    let raf = 0;
    const inicio = performance.now();
    const paso = (t: number) => {
      const k = Math.min(1, (t - inicio) / duracion);
      const suave = 1 - Math.pow(1 - k, 3);
      setMostrado(Math.round(valor * suave));
      if (k < 1) raf = requestAnimationFrame(paso);
    };
    setMostrado(0);
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor, duracion]);

  return <>{mostrado}</>;
}
