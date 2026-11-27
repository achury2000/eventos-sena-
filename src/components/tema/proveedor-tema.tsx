"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  TEMA_EVENT,
  TEMA_POR_DEFECTO,
  TEMA_STORAGE_KEY,
  aplicarTema,
  esTema,
  resolverTema,
  type Tema,
  type TemaResuelto,
} from "@/lib/tema";

type ValorContextoTema = {
  tema: Tema;
  resuelto: TemaResuelto;
  setTema: (tema: Tema) => void;
};

const ContextoTema = createContext<ValorContextoTema | null>(null);

let temaEnMemoria: Tema | null = null;

function leerTema(): Tema {
  try {
    const guardado = window.localStorage.getItem(TEMA_STORAGE_KEY);
    return esTema(guardado) ? guardado : TEMA_POR_DEFECTO;
  } catch {
    return temaEnMemoria ?? TEMA_POR_DEFECTO;
  }
}

function guardarTema(tema: Tema): void {
  temaEnMemoria = tema;

  try {
    window.localStorage.setItem(TEMA_STORAGE_KEY, tema);
  } catch {
    // El fallback en memoria mantiene el tema durante esta sesión.
  }

  window.dispatchEvent(new Event(TEMA_EVENT));
}

function suscribirTema(aviso: () => void): () => void {
  const alCambiarAlmacen = (evento: StorageEvent) => {
    if (evento.key === null || evento.key === TEMA_STORAGE_KEY) {
      aviso();
    }
  };
  const alCambiarTema = () => aviso();

  window.addEventListener("storage", alCambiarAlmacen);
  window.addEventListener(TEMA_EVENT, alCambiarTema);

  return () => {
    window.removeEventListener("storage", alCambiarAlmacen);
    window.removeEventListener(TEMA_EVENT, alCambiarTema);
  };
}

function suscribirSistema(aviso: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", aviso);

  return () => media.removeEventListener("change", aviso);
}

function prefiereOscuro(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function temaDelServidor(): Tema {
  return TEMA_POR_DEFECTO;
}

function sistemaDelServidor(): boolean {
  return false;
}

export function ProveedorTema({ children }: { children: ReactNode }) {
  const tema = useSyncExternalStore(
    suscribirTema,
    leerTema,
    temaDelServidor
  );
  const sistemaOscuro = useSyncExternalStore(
    suscribirSistema,
    prefiereOscuro,
    sistemaDelServidor
  );
  const resuelto = resolverTema(tema, sistemaOscuro);

  useEffect(() => {
    aplicarTema(resuelto);
  }, [resuelto]);

  const setTema = useCallback((nuevoTema: Tema) => {
    guardarTema(nuevoTema);
  }, []);

  const valor = useMemo(
    () => ({ tema, resuelto, setTema }),
    [resuelto, setTema, tema]
  );

  return (
    <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>
  );
}

export function useTema(): ValorContextoTema {
  const contexto = useContext(ContextoTema);

  if (!contexto) {
    throw new Error("useTema debe usarse dentro de ProveedorTema");
  }

  return contexto;
}
