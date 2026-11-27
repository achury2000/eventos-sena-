// Lógica pura de la instalación (design.md, D7). El componente solo se encarga
// de los efectos del navegador; las decisiones se prueban sin DOM.

// Chrome puede disparar `beforeinstallprompt` antes de que React hidrate. El
// script inline del layout lo captura en `window` para que el botón no pierda
// el evento; esta clave es el contrato entre ese script y el hook.
export const CLAVE_PROMPT_INSTALACION = "__pwaInstallPrompt";

export const CAPTURA_PROMPT_INSTALACION_SCRIPT = `(function(){try{window.addEventListener("beforeinstallprompt",function(evento){evento.preventDefault();window.${CLAVE_PROMPT_INSTALACION}=evento;});}catch(error){}})();`;

export type EntradaBotonInstalacion = {
  standalone: boolean;
  tienePrompt: boolean;
  esIOS: boolean;
  navegadorConInstalacion: boolean;
};

/**
 * El botón se muestra en cualquier ruta mientras la app no esté instalada y
 * exista al menos un mecanismo: prompt nativo, iOS (Compartir) o un Chromium
 * que pueda instalarla aunque el prompt no haya llegado. No hay descarte
 * temporal: es la vía permanente (design.md, D7).
 */
export function debeMostrarBotonInstalacion(
  entrada: EntradaBotonInstalacion
): boolean {
  if (entrada.standalone) return false;
  return (
    entrada.tienePrompt ||
    entrada.esIOS ||
    entrada.navegadorConInstalacion
  );
}

/**
 * Detecta motores Chromium de escritorio/Android, donde la instalación existe
 * aunque `beforeinstallprompt` no haya llegado todavía. Se excluyen Electron y
 * los WebViews/navegadores embebidos: comparten el motor, pero no ofrecen la
 * instalación de la PWA.
 */
export function esNavegadorChromium(userAgent: string): boolean {
  const agente = userAgent.toLowerCase();
  if (!agente.includes("chrome")) return false;
  if (/electron|; wv\)|fban|fbav|instagram|micromessenger|line\//.test(agente)) {
    return false;
  }
  return true;
}

export function esAndroid(userAgent: string): boolean {
  return /android/i.test(userAgent);
}

/**
 * iPadOS se presenta como macOS desde la versión 13, así que la detección no
 * puede depender solo del user agent: un Mac con más de un punto de contacto es
 * un iPad.
 */
export function esIOS(
  userAgent: string,
  maxTouchPoints = 0,
  plataforma = ""
): boolean {
  const agente = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(agente)) return true;
  return plataforma.toLowerCase() === "macintel" && maxTouchPoints > 1;
}

/**
 * En iOS ningún navegador dispara `beforeinstallprompt`; las instrucciones del
 * menú Compartir son el único mecanismo real, también en Chrome/Firefox de iOS
 * porque todos usan WebKit.
 */
export function esSafariIOS(
  userAgent: string,
  maxTouchPoints = 0,
  plataforma = ""
): boolean {
  return esIOS(userAgent, maxTouchPoints, plataforma);
}
