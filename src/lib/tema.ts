export const TEMA_STORAGE_KEY = "eventos-sena-theme";
export const TEMA_EVENT = "eventos-sena-theme-change";

export type Tema = "light" | "dark" | "system";
export type TemaResuelto = "light" | "dark";

export const TEMA_POR_DEFECTO: Tema = "system";

export function esTema(valor: unknown): valor is Tema {
  return valor === "light" || valor === "dark" || valor === "system";
}

export function resolverTema(
  tema: Tema,
  prefiereOscuro: boolean
): TemaResuelto {
  if (tema === "system") {
    return prefiereOscuro ? "dark" : "light";
  }

  return tema;
}

export function aplicarTema(resuelto: TemaResuelto): void {
  if (typeof document === "undefined") return;

  const raiz = document.documentElement;
  raiz.setAttribute("data-theme", resuelto);
  raiz.style.colorScheme = resuelto;
}

/**
 * Se ejecuta en el <head> antes de que el navegador pinte el body. Mantiene la
 * misma lógica que `resolverTema` para que el DOM inicial y React coincidan.
 */
export const TEMA_SCRIPT = `(function(){try{var tema="system";try{var guardado=localStorage.getItem("${TEMA_STORAGE_KEY}");if(guardado==="light"||guardado==="dark"||guardado==="system")tema=guardado;}catch(error){}var oscuro=tema==="dark"||(tema==="system"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);var resuelto=oscuro?"dark":"light";document.documentElement.setAttribute("data-theme",resuelto);document.documentElement.style.colorScheme=resuelto;}catch(error){}})();`;
