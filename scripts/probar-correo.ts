/**
 * Utilidad de desarrollo para el correo de confirmación de inscripción.
 *
 *   npx tsx scripts/probar-correo.ts --preview
 *     Escribe el HTML en `_preview-email.html` y muestra el texto plano.
 *     No envía nada ni necesita credenciales. Sirve para iterar el diseño.
 *
 *   npx tsx scripts/probar-correo.ts tu-correo@gmail.com
 *     Envía una confirmación real de prueba a ese destinatario.
 *     Usa SMTP si hay variables SMTP_*, o Resend si están RESEND_API_KEY y
 *     EMAIL_FROM. También imprime el transporte resuelto (sin mostrar secretos).
 *     Con una cuenta de Resend sin dominio verificado, el remitente debe ser
 *     onboarding@resend.dev y el destinatario tiene que ser el correo de esa
 *     misma cuenta.
 *
 * Es una herramienta de humo, no forma parte del producto.
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import {
  enviarConfirmacionInscripcion,
  mensajeConfirmacion,
  type DatosConfirmacionInscripcion,
} from "../src/lib/email";
import { resolverTransporte } from "../src/lib/email/transporte";

function datosDePrueba(destinatario: string): DatosConfirmacionInscripcion {
  return {
    destinatario,
    nombreTitular: "Jhonatan Prueba",
    nombreEvento: "Encuentro de Bienestar y Liderazgo",
    lugar: "Centro Agropecuario La Salada",
    fechaInicio: new Date("2026-11-20T13:00:00.000Z"),
    fechaFin: new Date("2026-11-21T21:00:00.000Z"),
    totalPersonas: 3,
  };
}

const arg = process.argv[2]?.trim();

if (!arg) {
  console.error(
    "Uso:\n" +
      "  npx tsx scripts/probar-correo.ts --preview             (vista previa, no envía)\n" +
      "  npx tsx scripts/probar-correo.ts <correo-destino>      (envío real de prueba)"
  );
  process.exit(1);
}

const resolucion = resolverTransporte();
const transporte = resolucion.transporte?.tipo ?? "ninguno";

if (arg === "--preview") {
  const mensaje = mensajeConfirmacion(datosDePrueba("tu-correo@gmail.com"));
  writeFileSync("_preview-email.html", mensaje.html, "utf8");
  console.log("Transporte configurado:", transporte);
  console.log("Asunto:", mensaje.asunto);
  console.log("--- TEXTO PLANO ---");
  console.log(mensaje.texto);
  console.log("--- HTML escrito en _preview-email.html ---");
} else {
  console.log(`Enviando confirmación de prueba a ${arg} ...`);
  console.log("Transporte configurado:", transporte);
  if (!resolucion.transporte && resolucion.detalle) {
    console.log("Detalle de configuración:", resolucion.detalle);
  }
  await enviarConfirmacionInscripcion(datosDePrueba(arg));
  console.log(
    "Listo. Si arriba no apareció un error, el transporte aceptó el envío.\n" +
      "Revisa la bandeja de entrada y también la carpeta de Spam."
  );
}
