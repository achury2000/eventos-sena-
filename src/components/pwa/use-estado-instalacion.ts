"use client";

import { useSyncExternalStore } from "react";
import {
  CLAVE_PROMPT_INSTALACION,
  esAndroid,
  esNavegadorChromium,
  esSafariIOS,
} from "@/lib/pwa/instalacion";

// `beforeinstallprompt` no forma parte del DOM lib de TypeScript.
export type EventoInstalacion = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorConStandalone = Navigator & { standalone?: boolean };
type WindowConPrompt = Window & {
  [CLAVE_PROMPT_INSTALACION]?: EventoInstalacion;
};

export type EstadoInstalacion = {
  installed: boolean;
  ios: boolean;
  android: boolean;
  tienePrompt: boolean;
  navegadorConInstalacion: boolean;
};

const ESTADO_SERVIDOR: EstadoInstalacion = Object.freeze({
  installed: false,
  ios: false,
  android: false,
  tienePrompt: false,
  navegadorConInstalacion: false,
});

// Store mínimo con `useSyncExternalStore`: permite leer capacidades del
// navegador sin setState dentro de un efecto ni desajustes de hidratación.
let estado: EstadoInstalacion = ESTADO_SERVIDOR;
let eventoInstalacion: EventoInstalacion | null = null;
let inicializado = false;
const oyentes = new Set<() => void>();

function emitir() {
  for (const oyente of oyentes) oyente();
}

function actualizar(parcial: Partial<EstadoInstalacion>) {
  estado = { ...estado, ...parcial };
  emitir();
}

function estaInstalada(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as NavigatorConStandalone).standalone === true
  );
}

function inicializar() {
  if (inicializado || typeof window === "undefined") return;
  inicializado = true;

  // El script inline del layout pudo capturar el evento antes de la hidratación.
  const capturado =
    (window as WindowConPrompt)[CLAVE_PROMPT_INSTALACION] ?? null;
  eventoInstalacion = capturado;
  const userAgent = navigator.userAgent;

  estado = {
    installed: estaInstalada(),
    ios: esSafariIOS(
      userAgent,
      navigator.maxTouchPoints,
      navigator.platform
    ),
    android: esAndroid(userAgent),
    tienePrompt: capturado !== null,
    navegadorConInstalacion: esNavegadorChromium(userAgent),
  };

  window.addEventListener("beforeinstallprompt", (evento) => {
    evento.preventDefault();
    const capturadoAhora = evento as EventoInstalacion;
    eventoInstalacion = capturadoAhora;
    (window as WindowConPrompt)[CLAVE_PROMPT_INSTALACION] = capturadoAhora;
    actualizar({ tienePrompt: true });
  });

  window.addEventListener("appinstalled", () => {
    eventoInstalacion = null;
    delete (window as WindowConPrompt)[CLAVE_PROMPT_INSTALACION];
    actualizar({ installed: true, tienePrompt: false });
  });

  window
    .matchMedia("(display-mode: standalone)")
    .addEventListener("change", () => {
      actualizar({ installed: estaInstalada() });
    });
}

function suscribir(oyente: () => void): () => void {
  inicializar();
  oyentes.add(oyente);

  return () => {
    oyentes.delete(oyente);
  };
}

function leer(): EstadoInstalacion {
  return estado;
}

function delServidor(): EstadoInstalacion {
  return ESTADO_SERVIDOR;
}

export function useEstadoInstalacion(): EstadoInstalacion {
  return useSyncExternalStore(suscribir, leer, delServidor);
}

export async function lanzarInstalacion(): Promise<void> {
  const evento = eventoInstalacion;
  if (!evento) return;

  try {
    await evento.prompt();
    await evento.userChoice;
  } catch {
    // El navegador puede invalidar el prompt; la persona puede usar el menú
    // del navegador desde el diálogo.
  } finally {
    eventoInstalacion = null;
    delete (window as WindowConPrompt)[CLAVE_PROMPT_INSTALACION];
    // El prompt es de un solo uso. El botón sigue visible para reabrir el
    // diálogo con instrucciones manuales si el navegador las ofrece.
    actualizar({ tienePrompt: false });
  }
}
