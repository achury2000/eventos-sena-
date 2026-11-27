export const MENSAJE_SIN_CONEXION =
  "Sin conexión. Necesitas internet para enviar; inténtalo de nuevo cuando recuperes la señal.";

export const MENSAJE_COPIA_GUARDADA =
  "Estás viendo una copia guardada y puede estar desactualizada.";

export const MENSAJE_ESCRITURA_BLOQUEADA =
  "No se guardó: necesitas conexión para enviar.";

/**
 * `navigator.onLine` es una pista, no una garantía: puede reportar `false` con
 * una red local disponible. Por eso solo se usa para elegir el mensaje de
 * error, nunca para deshabilitar botones de forma permanente.
 */
export function estaSinConexion(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
