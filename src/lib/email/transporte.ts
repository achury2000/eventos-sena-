import { createTransport } from "nodemailer";
import { Resend } from "resend";

/**
 * Selección y ejecución del transporte de correo (design.md, D1-D3).
 *
 * SMTP tiene prioridad: si existe al menos una variable `SMTP_*`, se intenta
 * usar SMTP y una configuración parcial NO cae a Resend. Sin ninguna variable
 * SMTP, Resend sigue siendo el respaldo de desarrollo/pruebas.
 */

export interface MensajeTransporte {
  asunto: string;
  texto: string;
  html: string;
}

export interface TransporteSmtp {
  tipo: "smtp";
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
}

export interface TransporteResend {
  tipo: "resend";
  apiKey: string;
  from: string;
}

export type Transporte = TransporteSmtp | TransporteResend;

export type MotivoSinTransporte = "sin-configuracion" | "smtp-incompleto";

export interface ResolucionTransporte {
  transporte: Transporte | null;
  motivo: MotivoSinTransporte | null;
  /** Nombres de variables inválidas o faltantes; nunca incluye valores. */
  detalle: string | null;
}

const VARIABLES_SMTP = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
] as const;

function valor(nombre: string): string | undefined {
  const contenido = process.env[nombre]?.trim();
  return contenido ? contenido : undefined;
}

function hayIntencionSmtp(): boolean {
  return VARIABLES_SMTP.some((nombre) => valor(nombre) !== undefined);
}

function leerBooleano(valorCrudo: string | undefined): boolean | null {
  if (!valorCrudo) return false;
  const normalizado = valorCrudo.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalizado)) return true;
  if (["false", "0", "no", "off"].includes(normalizado)) return false;
  return null;
}

function leerPuerto(valorCrudo: string | undefined): number | null {
  if (!valorCrudo) return 587;
  const puerto = Number(valorCrudo);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) return null;
  return puerto;
}

/**
 * Resuelve el transporte a usar sin contactar al proveedor. Es una función pura
 * respecto del entorno (solo lee `process.env`), para poder probar la prioridad
 * y la validación sin red.
 */
export function resolverTransporte(): ResolucionTransporte {
  const from = valor("EMAIL_FROM");

  if (hayIntencionSmtp()) {
    const host = valor("SMTP_HOST");
    const port = leerPuerto(valor("SMTP_PORT"));
    const secure = leerBooleano(valor("SMTP_SECURE"));
    const user = valor("SMTP_USER");
    const password = valor("SMTP_PASSWORD");
    const problemas: string[] = [];

    if (!host) problemas.push("SMTP_HOST");
    if (!from) problemas.push("EMAIL_FROM");
    if (port === null) problemas.push("SMTP_PORT");
    if (secure === null) problemas.push("SMTP_SECURE");
    if ((user && !password) || (!user && password)) {
      problemas.push("SMTP_USER/SMTP_PASSWORD");
    }

    if (problemas.length > 0 || !host || !from || port === null || secure === null) {
      return {
        transporte: null,
        motivo: "smtp-incompleto",
        detalle: problemas.join(", "),
      };
    }

    return {
      transporte: {
        tipo: "smtp",
        host,
        port,
        secure,
        from,
        ...(user && password ? { user, password } : {}),
      },
      motivo: null,
      detalle: null,
    };
  }

  const apiKey = valor("RESEND_API_KEY");
  if (apiKey && from) {
    return {
      transporte: { tipo: "resend", apiKey, from },
      motivo: null,
      detalle: null,
    };
  }

  return { transporte: null, motivo: "sin-configuracion", detalle: null };
}

/**
 * Envía el mensaje con el transporte ya resuelto. Puede lanzar: la contención
 * de errores vive en `enviarCorreo`, que es el punto que conoce la política de
 * falla abierta.
 */
export async function enviarPorTransporte(
  transporte: Transporte,
  destinatario: string,
  mensaje: MensajeTransporte
): Promise<void> {
  if (transporte.tipo === "smtp") {
    const transporter = createTransport({
      host: transporte.host,
      port: transporte.port,
      secure: transporte.secure,
      ...(transporte.user && transporte.password
        ? { auth: { user: transporte.user, pass: transporte.password } }
        : {}),
    });

    await transporter.sendMail({
      from: transporte.from,
      to: destinatario,
      subject: mensaje.asunto,
      text: mensaje.texto,
      html: mensaje.html,
    });
    return;
  }

  const resend = new Resend(transporte.apiKey);
  const { error } = await resend.emails.send({
    from: transporte.from,
    to: destinatario,
    subject: mensaje.asunto,
    text: mensaje.texto,
    html: mensaje.html,
  });

  if (error) {
    throw new Error(error.message);
  }
}
