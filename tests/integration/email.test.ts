import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatosConfirmacionInscripcion } from "@/lib/email";
import { resolverTransporte } from "@/lib/email/transporte";

/**
 * Los SDK de correo se sustituyen por dobles controlados: la suite no puede (ni
 * debe) hablar con un proveedor real. Lo que importa verificar aquí es el
 * contrato del módulo —selección de transporte, payload, falla abierta y
 * contención de errores— no el transporte HTTP de cada SDK (design.md, D6).
 */
const { sendMock, sendMailMock, createTransportMock, afterMock } = vi.hoisted(
  () => {
    const sendMailMock = vi.fn();
    return {
      sendMock: vi.fn(),
      sendMailMock,
      createTransportMock: vi.fn(() => ({ sendMail: sendMailMock })),
      afterMock: vi.fn((fn: () => unknown) => fn()),
    };
  }
);

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

vi.mock("nodemailer", () => ({
  createTransport: createTransportMock,
}));

// `after` solo existe dentro de una petición en el servidor; el doble la
// ejecuta al invocarse para poder observar si el módulo la programa.
vi.mock("next/server", () => ({
  after: (fn: () => unknown) => afterMock(fn),
}));

const CLAVES = [
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "HABILITAR_CONFIRMACION_EVENTO",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
] as const;
const ORIGINAL: Record<string, string | undefined> = {};
for (const clave of CLAVES) ORIGINAL[clave] = process.env[clave];

/**
 * Cada caso recarga el módulo: `avisoEmitido` es estado a nivel de módulo (una
 * sola advertencia por proceso, como en `rate-limit.ts`), así que hace falta un
 * módulo nuevo para observar la advertencia otra vez. Los `vi.mock` siguen
 * aplicando tras `resetModules`.
 */
async function cargarModulo() {
  vi.resetModules();
  return import("@/lib/email");
}

function datosConfirmacion(): DatosConfirmacionInscripcion {
  return {
    destinatario: "titular@test.local",
    nombreTitular: "Ana Pérez",
    nombreEvento: "Encuentro de Bienestar",
    lugar: "Centro Agropecuario",
    // 13:00Z y 21:00Z son 08:00 y 16:00 en America/Bogota (UTC-5).
    fechaInicio: new Date("2026-03-10T13:00:00.000Z"),
    fechaFin: new Date("2026-03-11T21:00:00.000Z"),
    totalPersonas: 3,
  };
}

function configurarSmtpCompleto(): void {
  process.env.SMTP_HOST = "smtp.test.local";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_SECURE = "false";
  process.env.SMTP_USER = "usuario";
  process.env.SMTP_PASSWORD = "secreto";
  process.env.EMAIL_FROM = "no-responder@test.local";
}

beforeEach(() => {
  vi.resetAllMocks();
  afterMock.mockImplementation((fn: () => unknown) => fn());
  createTransportMock.mockReturnValue({ sendMail: sendMailMock });
  sendMock.mockResolvedValue({ data: { id: "correo-1" }, error: null });
  sendMailMock.mockResolvedValue({ messageId: "smtp-1" });
  for (const clave of CLAVES) delete process.env[clave];
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const clave of CLAVES) {
    if (ORIGINAL[clave] === undefined) delete process.env[clave];
    else process.env[clave] = ORIGINAL[clave];
  }
});

describe("resolverTransporte", () => {
  it("prioriza SMTP cuando existe configuración completa", () => {
    configurarSmtpCompleto();

    const resolucion = resolverTransporte();

    expect(resolucion.transporte).toMatchObject({
      tipo: "smtp",
      host: "smtp.test.local",
      port: 587,
      secure: false,
      user: "usuario",
      password: "secreto",
      from: "no-responder@test.local",
    });
    expect(resolucion.motivo).toBeNull();
  });

  it("usa Resend cuando no hay ninguna variable SMTP", () => {
    process.env.RESEND_API_KEY = "re_test_123";
    process.env.EMAIL_FROM = "no-responder@test.local";

    const resolucion = resolverTransporte();

    expect(resolucion.transporte).toMatchObject({
      tipo: "resend",
      apiKey: "re_test_123",
      from: "no-responder@test.local",
    });
  });

  it("no cae a Resend cuando la configuración SMTP es parcial", () => {
    process.env.SMTP_HOST = "smtp.test.local";
    process.env.SMTP_USER = "usuario";
    process.env.RESEND_API_KEY = "re_test_123";
    process.env.EMAIL_FROM = "no-responder@test.local";

    const resolucion = resolverTransporte();

    expect(resolucion.transporte).toBeNull();
    expect(resolucion.motivo).toBe("smtp-incompleto");
    expect(resolucion.detalle).toContain("SMTP_USER/SMTP_PASSWORD");
  });

  it("rechaza un puerto o un booleano inválidos", () => {
    configurarSmtpCompleto();
    process.env.SMTP_PORT = "no-es-un-puerto";

    expect(resolverTransporte().transporte).toBeNull();

    configurarSmtpCompleto();
    process.env.SMTP_SECURE = "quizás";

    expect(resolverTransporte().transporte).toBeNull();
  });

  it("permite SMTP sin autenticación si usuario y contraseña están vacíos", () => {
    process.env.SMTP_HOST = "smtp.test.local";
    process.env.EMAIL_FROM = "no-responder@test.local";

    const resolucion = resolverTransporte();

    expect(resolucion.transporte).toMatchObject({
      tipo: "smtp",
      host: "smtp.test.local",
      port: 587,
      secure: false,
      from: "no-responder@test.local",
    });
    expect(resolucion.transporte).not.toHaveProperty("user");
    expect(resolucion.transporte).not.toHaveProperty("password");
  });

  it("devuelve sin-configuracion cuando no hay SMTP ni Resend", () => {
    const resolucion = resolverTransporte();

    expect(resolucion.transporte).toBeNull();
    expect(resolucion.motivo).toBe("sin-configuracion");
  });
});

describe("mensajeConfirmacion", () => {
  it("arma asunto y cuerpo con los datos del evento", async () => {
    const { mensajeConfirmacion } = await cargarModulo();

    const mensaje = mensajeConfirmacion(datosConfirmacion());

    expect(mensaje.asunto).toContain("Encuentro de Bienestar");
    expect(mensaje.texto).toContain("Ana Pérez");
    expect(mensaje.texto).toContain("Centro Agropecuario");
    expect(mensaje.texto).toContain("Titular y 2 acompañantes");
    expect(mensaje.html).toContain("Encuentro de Bienestar");
  });

  it("presenta las fechas en zona de Bogotá", async () => {
    const { mensajeConfirmacion } = await cargarModulo();

    const mensaje = mensajeConfirmacion(datosConfirmacion());

    // 13:00Z es 08:00 en Bogotá, no 13:00. El aserto no depende de minúsculos
    // detalles de ICU (p. ej. "8:00" vs "08:00").
    expect(mensaje.texto).toMatch(/\b0?8:00\b/);
    expect(mensaje.texto).toMatch(/marzo/);
    expect(mensaje.texto).not.toContain("13:00");
  });
});

describe("enviarCorreo", () => {
  it("envía por SMTP con remitente, destinatario, asunto y cuerpo", async () => {
    configurarSmtpCompleto();
    process.env.SMTP_PORT = "465";
    process.env.SMTP_SECURE = "true";
    const { enviarConfirmacionInscripcion } = await cargarModulo();

    await enviarConfirmacionInscripcion(datosConfirmacion());

    expect(createTransportMock).toHaveBeenCalledWith({
      host: "smtp.test.local",
      port: 465,
      secure: true,
      auth: { user: "usuario", pass: "secreto" },
    });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const payload = sendMailMock.mock.calls[0][0];
    expect(payload.from).toBe("no-responder@test.local");
    expect(payload.to).toBe("titular@test.local");
    expect(payload.subject).toContain("Encuentro de Bienestar");
    expect(payload.text).toContain("Centro Agropecuario");
    expect(payload.html).toContain("Centro Agropecuario");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("envía por SMTP sin autenticación cuando usuario y contraseña están vacíos", async () => {
    process.env.SMTP_HOST = "smtp.test.local";
    process.env.EMAIL_FROM = "no-responder@test.local";
    const { enviarConfirmacionInscripcion } = await cargarModulo();

    await enviarConfirmacionInscripcion(datosConfirmacion());

    expect(createTransportMock).toHaveBeenCalledWith({
      host: "smtp.test.local",
      port: 587,
      secure: false,
    });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });

  it("envía por Resend cuando no hay ninguna variable SMTP", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    process.env.EMAIL_FROM = "no-responder@test.local";
    const { enviarConfirmacionInscripcion } = await cargarModulo();

    await enviarConfirmacionInscripcion(datosConfirmacion());

    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0][0];
    expect(payload.from).toBe("no-responder@test.local");
    expect(payload.to).toBe("titular@test.local");
    expect(payload.subject).toContain("Encuentro de Bienestar");
    expect(payload.text).toContain("Centro Agropecuario");
    expect(payload.html).toContain("Centro Agropecuario");
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it("no cae a Resend y advierte cuando SMTP está configurado a medias", async () => {
    process.env.SMTP_HOST = "smtp.test.local";
    process.env.SMTP_USER = "usuario";
    process.env.RESEND_API_KEY = "re_test_123";
    process.env.EMAIL_FROM = "no-responder@test.local";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { enviarConfirmacionInscripcion } = await cargarModulo();

    await enviarConfirmacionInscripcion(datosConfirmacion());

    expect(createTransportMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("SMTP incompleta");
    expect(warn.mock.calls[0][0]).toContain("SMTP_USER/SMTP_PASSWORD");
  });

  it("no llama a ningún proveedor y advierte UNA sola vez sin configuración", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { enviarConfirmacionInscripcion } = await cargarModulo();

    await enviarConfirmacionInscripcion(datosConfirmacion());
    await enviarConfirmacionInscripcion(datosConfirmacion());

    expect(createTransportMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("NO se están enviando");
  });

  it("no propaga un rechazo del proveedor Resend", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    process.env.EMAIL_FROM = "no-responder@test.local";
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "dominio no verificado" },
    });
    const { enviarConfirmacionInscripcion } = await cargarModulo();

    await expect(
      enviarConfirmacionInscripcion(datosConfirmacion())
    ).resolves.toBeUndefined();

    expect(error).toHaveBeenCalled();
  });

  it("no propaga una excepción de red del SDK de Resend", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    process.env.EMAIL_FROM = "no-responder@test.local";
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    sendMock.mockRejectedValue(new Error("ECONNRESET"));
    const { enviarConfirmacionInscripcion } = await cargarModulo();

    await expect(
      enviarConfirmacionInscripcion(datosConfirmacion())
    ).resolves.toBeUndefined();

    expect(error).toHaveBeenCalled();
  });

  it("no propaga una excepción de red de SMTP", async () => {
    configurarSmtpCompleto();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    sendMailMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const { enviarConfirmacionInscripcion } = await cargarModulo();

    await expect(
      enviarConfirmacionInscripcion(datosConfirmacion())
    ).resolves.toBeUndefined();

    expect(error).toHaveBeenCalled();
  });
});

describe("programarConfirmacionInscripcion (HABILITAR_CONFIRMACION_EVENTO)", () => {
  const CLAVE = "HABILITAR_CONFIRMACION_EVENTO";
  const ORIGINAL = process.env[CLAVE];

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env[CLAVE];
    else process.env[CLAVE] = ORIGINAL;
  });

  it("no programa ni envía nada cuando la variable no está declarada", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { programarConfirmacionInscripcion } = await cargarModulo();

    programarConfirmacionInscripcion(datosConfirmacion());

    expect(afterMock).not.toHaveBeenCalled();
    expect(createTransportMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
    // Informativo, no advertencia: es una configuración intencional.
    expect(info).toHaveBeenCalledTimes(1);
    expect(info.mock.calls[0][0]).toContain("deshabilitada");
  });

  it("no envía cuando la variable es falsa (case-insensitive)", async () => {
    process.env[CLAVE] = "FALSE";
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { programarConfirmacionInscripcion } = await cargarModulo();

    programarConfirmacionInscripcion(datosConfirmacion());

    expect(afterMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledTimes(1);
  });

  it("no emite el aviso de transporte cuando está deshabilitada", async () => {
    process.env[CLAVE] = "false";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { programarConfirmacionInscripcion } = await cargarModulo();

    programarConfirmacionInscripcion(datosConfirmacion());

    expect(warn).not.toHaveBeenCalled();
  });

  it("programa el envío cuando la variable es verdadera", async () => {
    process.env[CLAVE] = "true";
    const { programarConfirmacionInscripcion } = await cargarModulo();

    programarConfirmacionInscripcion(datosConfirmacion());

    expect(afterMock).toHaveBeenCalledTimes(1);
  });

  it("acepta valores equivalentes a verdadero (1, yes, on)", async () => {
    for (const valor of ["1", "YES", "On", " true "]) {
      afterMock.mockClear();
      process.env[CLAVE] = valor;
      const { programarConfirmacionInscripcion } = await cargarModulo();

      programarConfirmacionInscripcion(datosConfirmacion());

      expect(afterMock).toHaveBeenCalledTimes(1);
    }
  });

  it("aplica el transporte y falla abierta cuando está habilitada", async () => {
    process.env[CLAVE] = "true";
    process.env.RESEND_API_KEY = "re_test_123";
    process.env.EMAIL_FROM = "no-responder@test.local";
    const { programarConfirmacionInscripcion } = await cargarModulo();

    programarConfirmacionInscripcion(datosConfirmacion());

    // afterMock ejecuta la función programada de inmediato.
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
