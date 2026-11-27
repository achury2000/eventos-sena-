"use client";

import { useSyncExternalStore } from "react";

function suscribir(aviso: () => void): () => void {
  window.addEventListener("online", aviso);
  window.addEventListener("offline", aviso);

  return () => {
    window.removeEventListener("online", aviso);
    window.removeEventListener("offline", aviso);
  };
}

function leer(): boolean {
  return navigator.onLine === false;
}

function delServidor(): boolean {
  // En el servidor no hay `navigator`; se asume conexión para no mostrar el
  // aviso durante la hidratación.
  return false;
}

export function useSinConexion(): boolean {
  return useSyncExternalStore(suscribir, leer, delServidor);
}
