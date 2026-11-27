import { after } from "next/server";
import {
  enviarPorTransporte,
  resolverTransporte,
  type ResolucionTransporte,
} from "@/lib/email/transporte";

/**
 * Notificación por correo de la plataforma (CONTEXT.md §9).
 *
 * Módulo de servidor: usa credenciales de entorno, así que NO se importa desde
 * componentes de cliente (mismo patrón que `storage.ts` y `rate-limit.ts`).
 *
 * Falla abierta, igual que `rate-limit.ts`: sin credenciales configuradas no se
 * envía nada y solo se advierte una vez por proceso. La confirmación en
 * pantalla ya comunicó el éxito de la inscripción, así que el correo es una
 * cortesía que no puede condicionar la operación ni romper el desarrollo local
 * o el CI, donde el proveedor no está configurado.
 */

export interface DatosConfirmacionInscripcion {
  destinatario: string;
  nombreTitular: string;
  nombreEvento: string;
  lugar: string;
  fechaInicio: Date;
  fechaFin: Date;
  /** Titular más acompañantes. */
  totalPersonas: number;
}

export interface Mensaje {
  asunto: string;
  texto: string;
  html: string;
}

// El correo se escribe pensando en quien lo lee en Colombia, sin importar la
// zona horaria con la que corra el servidor. `es-CO` fija además el formato
// de fecha local (día/mes largo).
const ZONA_HORARIA = "America/Bogota";

// Paleta institucional (ver `globals.css`). Los clientes de correo no cargan las
// hojas de estilo de la app ni entienden flex/grid (Outlook usa el motor de
// Word): por eso los estilos van en línea y el layout se arma con tablas.
const COLOR = {
  verde: "#25a200",
  verdeTitulo: "#14532d",
  verdeTexto: "#1b4d00",
  verdeClaro: "#e9f6df",
  fondo: "#f2f6ee",
  fondoSutil: "#f7faf1",
  borde: "#dce7d3",
  bordeFila: "#eef3e9",
  texto: "#1a1a1a",
  textoSuave: "#4b5563",
  textoMuted: "#5e6b54",
  blanco: "#ffffff",
} as const;

const FUENTE = "Arial, Helvetica, sans-serif";

function formatearFecha(fecha: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: ZONA_HORARIA,
  }).format(fecha);
}

function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function describirGrupo(totalPersonas: number): string {
  const acompanantes = totalPersonas - 1;
  if (acompanantes <= 0) return "Solo el titular";
  return `Titular y ${acompanantes} acompañante${acompanantes === 1 ? "" : "s"}`;
}

/**
 * Arma el asunto y el cuerpo (texto plano + HTML) de la confirmación. Es una
 * función pura: no envía ni toca el entorno, para poder verificarla sola.
 */
export function mensajeConfirmacion(
  datos: DatosConfirmacionInscripcion
): Mensaje {
  const {
    nombreTitular,
    nombreEvento,
    lugar,
    fechaInicio,
    fechaFin,
    totalPersonas,
  } = datos;

  const inicio = formatearFecha(fechaInicio);
  const fin = formatearFecha(fechaFin);
  const grupo = describirGrupo(totalPersonas);

  const asunto = `Confirmación de inscripción — ${nombreEvento}`;

  const texto = [
    `Hola, ${nombreTitular}.`,
    "",
    `Tu inscripción a "${nombreEvento}" quedó confirmada.`,
    "",
    `Evento: ${nombreEvento}`,
    `Lugar: ${lugar}`,
    `Inicio: ${inicio}`,
    `Fin: ${fin}`,
    `Personas inscritas: ${grupo}`,
    "",
    "Guarda este correo como referencia.",
  ].join("\n");

  const fila = (etiqueta: string, valor: string, ultima = false): string => {
    const borde = ultima ? "" : `border-bottom:1px solid ${COLOR.bordeFila};`;
    return [
      "                <tr>",
      `                  <td width="150" style="padding:10px 0;${borde}font-family:${FUENTE};font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:${COLOR.textoMuted};vertical-align:top;">${escaparHtml(etiqueta)}</td>`,
      `                  <td style="padding:10px 0;${borde}font-family:${FUENTE};font-size:15px;font-weight:bold;color:${COLOR.texto};vertical-align:top;">${escaparHtml(valor)}</td>`,
      "                </tr>",
    ].join("\n");
  };

  const html = [
    "<!DOCTYPE html>",
    '<html lang="es">',
    "<head>",
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${escaparHtml(asunto)}</title>`,
    "</head>",
    `<body style="margin:0;padding:0;background-color:${COLOR.fondo};">`,
    // Preheader: texto oculto que Gmail y Outlook muestran junto al asunto en la
    // lista de la bandeja. No se ve en el cuerpo del mensaje.
    `  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${COLOR.fondo};font-size:1px;">${escaparHtml(`Inscripción confirmada a ${nombreEvento} — ${inicio}`)}</div>`,
    `  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR.fondo};">`,
    "    <tr>",
    '      <td align="center" style="padding:32px 12px;">',
    '        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #dce7d3;border-radius:14px;overflow:hidden;">',
    "          <tr>",
    `            <td style="background-color:${COLOR.verde};padding:26px 32px;">`,
    `              <div style="font-family:${FUENTE};font-size:22px;font-weight:bold;letter-spacing:2px;color:${COLOR.blanco};">SENA</div>`,
    `              <div style="font-family:${FUENTE};font-size:13px;color:#e4f5d5;padding-top:2px;">Plataforma de eventos</div>`,
    "            </td>",
    "          </tr>",
    "          <tr>",
    '            <td style="padding:32px 32px 4px;">',
    '              <table role="presentation" cellpadding="0" cellspacing="0">',
    "                <tr>",
    `                  <td style="background-color:${COLOR.verdeClaro};border-radius:999px;padding:6px 14px;font-family:${FUENTE};font-size:12px;font-weight:bold;letter-spacing:.4px;color:${COLOR.verdeTexto};">&#10003;&nbsp; Inscripción confirmada</td>`,
    "                </tr>",
    "              </table>",
    `              <h1 style="margin:18px 0 0;font-family:${FUENTE};font-size:22px;line-height:1.3;color:${COLOR.verdeTitulo};">¡Listo, ${escaparHtml(nombreTitular)}!</h1>`,
    `              <p style="margin:10px 0 0;font-family:${FUENTE};font-size:15px;line-height:1.55;color:${COLOR.textoSuave};">Tu inscripción a <strong style="color:${COLOR.texto};">${escaparHtml(nombreEvento)}</strong> quedó confirmada. Estos son los detalles:</p>`,
    "            </td>",
    "          </tr>",
    "          <tr>",
    '            <td style="padding:20px 32px 8px;">',
    '              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">',
    fila("Evento", nombreEvento),
    fila("Lugar", lugar),
    fila("Inicio", inicio),
    fila("Fin", fin),
    fila("Personas inscritas", grupo, true),
    "              </table>",
    "            </td>",
    "          </tr>",
    "          <tr>",
    '            <td style="padding:20px 32px 32px;">',
    `              <p style="margin:0;font-family:${FUENTE};font-size:15px;line-height:1.55;color:${COLOR.textoSuave};">Guarda este correo como referencia. Te esperamos.</p>`,
    "            </td>",
    "          </tr>",
    "          <tr>",
    `            <td style="background-color:${COLOR.fondoSutil};border-top:1px solid ${COLOR.borde};padding:18px 32px;">`,
    `              <p style="margin:0;font-family:${FUENTE};font-size:12px;line-height:1.5;color:${COLOR.textoMuted};">Servicio Nacional de Aprendizaje — SENA. Si no reconoces esta inscripción, puedes ignorar este mensaje.</p>`,
    "            </td>",
    "          </tr>",
    "        </table>",
    "      </td>",
    "    </tr>",
    "  </table>",
    "</body>",
    "</html>",
  ].join("\n");

  return { asunto, texto, html };
}

let avisoEmitido = false;

function advertirSinTransporte(resolucion: ResolucionTransporte): void {
  if (avisoEmitido) return;
  avisoEmitido = true;

  if (resolucion.motivo === "smtp-incompleto") {
    const detalle = resolucion.detalle ? ` (${resolucion.detalle})` : "";
    console.warn(
      `[email] Configuración SMTP incompleta${detalle}: ` +
        "los correos NO se están enviando."
    );
    return;
  }

  console.warn(
    "[email] No hay transporte de correo configurado (SMTP/Resend): " +
      "los correos NO se están enviando."
  );
}

/**
 * Activa/desactiva la confirmación por correo tras una inscripción
 * (`HABILITAR_CONFIRMACION_EVENTO`). Por defecto está deshabilitada: si el SENA
 * no contrata servicio de correo, basta con no declarar la variable.
 */
function isConfirmationEmailEnabled(): boolean {
  const value = process.env.HABILITAR_CONFIRMACION_EVENTO;
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

let avisoDesactivadoEmitido = false;

/**
 * Envía un mensaje con el transporte configurado (SMTP o Resend). NUNCA lanza:
 * ni la ausencia de configuración, ni un rechazo del proveedor, ni un fallo de
 * red pueden propagarse a quien originó la operación (design.md, D4). Los
 * errores quedan en el log del servidor para poder detectar una integración
 * rota.
 */
export async function enviarCorreo(
  destinatario: string,
  mensaje: Mensaje
): Promise<void> {
  const resolucion = resolverTransporte();
  if (!resolucion.transporte) {
    advertirSinTransporte(resolucion);
    return;
  }

  try {
    await enviarPorTransporte(resolucion.transporte, destinatario, mensaje);
  } catch (err) {
    console.error(
      "[email] No se pudo enviar el correo: " +
        (err instanceof Error ? err.message : String(err))
    );
  }
}

/** Envía la confirmación de inscripción al titular. NUNCA lanza. */
export async function enviarConfirmacionInscripcion(
  datos: DatosConfirmacionInscripcion
): Promise<void> {
  try {
    await enviarCorreo(datos.destinatario, mensajeConfirmacion(datos));
  } catch (err) {
    // Hasta armar el mensaje (p. ej. una fecha inválida) queda contenido aquí:
    // un throw dentro de `after()` ensuciaría el servidor sin poder ya cambiar
    // la respuesta que la persona recibió.
    console.error(
      "[email] No se pudo preparar la confirmación: " +
        (err instanceof Error ? err.message : String(err))
    );
  }
}

/**
 * Programa la confirmación para después de la respuesta (design.md, D2). El
 * route handler no llama al envío directo sino a esta envoltura: deja el
 * handler testeable (se mockea este módulo) y concentra el `after()` aquí.
 *
 * No lanza: si `after()` no está disponible (p. ej. fuera del contexto de una
 * petición) se registra y se sigue, porque el correo es cortesía.
 */
export function programarConfirmacionInscripcion(
  datos: DatosConfirmacionInscripcion
): void {
  if (!isConfirmationEmailEnabled()) {
    if (!avisoDesactivadoEmitido) {
      console.info(
        "[email] Confirmación de inscripción deshabilitada " +
          "(HABILITAR_CONFIRMACION_EVENTO): no se enviará correo."
      );
      avisoDesactivadoEmitido = true;
    }
    return;
  }

  try {
    after(() => enviarConfirmacionInscripcion(datos));
  } catch (err) {
    console.error(
      "[email] No se pudo programar la confirmación: " +
        (err instanceof Error ? err.message : String(err))
    );
  }
}
