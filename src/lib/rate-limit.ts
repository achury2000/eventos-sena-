import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting de las superficies públicas (CONTEXT.md §7).
 *
 * Los límites de la tabla de abajo NO son un número arbitrario cada uno: el
 * del login es deliberadamente estricto y el del checkpoint deliberadamente
 * flojo, porque en el sitio del evento una sola red wifi puede tener cientos
 * de personas detrás de la misma IP pública por NAT. Un límite "razonable" para
 * un servidor normal dejaría a los asistentes reales fuera del evento.
 *
 * El del cambio de contraseña es tan estricto como el del login porque también
 * compara credenciales, pero lleva su PROPIO contador: son superficies distintas
 * y agotar una no debe bloquear la otra.
 */
export type SuperficiePublica =
  | "login"
  | "cambio-clave"
  | "inscripcion"
  | "checkpoint";

const LIMITES: Record<SuperficiePublica, { max: number; ventana: `${number} s` }> =
  {
    login: { max: 5, ventana: "900 s" },
    "cambio-clave": { max: 3, ventana: "900 s" },
    inscripcion: { max: 10, ventana: "60 s" },
    checkpoint: { max: 30, ventana: "60 s" },
  };

export type ResultadoLimite =
  | { permitido: true }
  | { permitido: false; mensaje: string; reintentarEnSegundos: number };

const IDENTIDAD_SIN_IP = "ip-desconocida";

let avisoEmitido = false;

function limitadores(): Record<SuperficiePublica, Ratelimit | null> | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Falla abierta (design.md, D2): sin el servicio de conteo la petición
    // pasa. Romper el desarrollo local y el CI para aplicar una protección que
    // no pueden configurar no es una protección, es un obstáculo. El aviso
    // existe para que la ausencia en producción no pase inadvertida.
    if (!avisoEmitido) {
      avisoEmitido = true;
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN sin configurar: " +
          "los límites por IP NO se están aplicando."
      );
    }
    return null;
  }

  const redis = new Redis({ url, token });
  return {
    login: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        LIMITES.login.max,
        LIMITES.login.ventana
      ),
      prefix: "sena:login",
    }),
    "cambio-clave": new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        LIMITES["cambio-clave"].max,
        LIMITES["cambio-clave"].ventana
      ),
      prefix: "sena:cambio-clave",
    }),
    inscripcion: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        LIMITES.inscripcion.max,
        LIMITES.inscripcion.ventana
      ),
      prefix: "sena:inscripcion",
    }),
    checkpoint: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        LIMITES.checkpoint.max,
        LIMITES.checkpoint.ventana
      ),
      prefix: "sena:checkpoint",
    }),
  };
}

/**
 * `NextRequest.ip` se eliminó en Next 15, así que la IP se lee de la cadena de
 * encabezados de reenvío. Se toma el PRIMER valor: es el cliente original, los
 * siguientes son los proxies intermedios. Un cliente que controle su propio
 * `x-forwarded-for` evade un límite por IP — es un riesgo aceptado (design.md,
 * D3) y no un olvido: para el objetivo real, frenar fuerza bruta y enumeración
 * masiva, el atacante necesita volumen alto, y eso exige más esfuerzo que el
 * que ahorra.
 */
export function ipDeOrigen(headers: Headers): string {
  const encadenada = headers.get("x-forwarded-for");
  if (encadenada) {
    const primera = encadenada.split(",")[0]?.trim();
    if (primera) return primera;
  }
  const directa = headers.get("x-real-ip")?.trim();
  if (directa) return directa;
  // Sin ninguna IP disponible se cuenta contra una identidad común. Sin
  // límite sería peor: el endpoint quedaría abierto justo cuando no se puede
  // saber quién pregunta.
  return IDENTIDAD_SIN_IP;
}

const MENSAJES: Record<SuperficiePublica, string> = {
  login:
    "Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar.",
  "cambio-clave":
    "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.",
  inscripcion:
    "Demasiados envíos seguidos desde esta conexión. Espera un momento e inténtalo de nuevo.",
  checkpoint:
    "Demasiadas consultas seguidas desde esta conexión. Espera un momento e inténtalo de nuevo.",
};

/**
 * Devuelve si la petición puede continuar. NUNCA lanza: un error de red del
 * servicio de conteo no puede tumbar el registro de asistencia de un evento.
 */
export async function comprobarLimite(
  superficie: SuperficiePublica,
  headers: Headers
): Promise<ResultadoLimite> {
  let limitadoresActivos: Record<SuperficiePublica, Ratelimit | null> | null;
  try {
    limitadoresActivos = limitadores();
  } catch {
    return { permitido: true };
  }

  const limitador = limitadoresActivos?.[superficie];
  if (!limitador) return { permitido: true };

  try {
    const { success, reset } = await limitador.limit(ipDeOrigen(headers));
    if (success) return { permitido: true };
    return {
      permitido: false,
      mensaje: MENSAJES[superficie],
      reintentarEnSegundos: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
    };
  } catch {
    // El servicio de conteo no respondió. Falla abierta por la misma razón que
    // arriba: el día del evento, no poder registrar gente es peor que permitir
    // un pico de peticiones.
    return { permitido: true };
  }
}
