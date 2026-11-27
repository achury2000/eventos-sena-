import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
  },
});

const BUCKET = process.env.S3_BUCKET ?? "firmas-digitales";

const CONTENIDO_FIRMA_POR_DEFECTO = "image/png";

export async function subirFirma(png: Buffer): Promise<string> {
  const clave = `inscripciones/${randomUUID()}.png`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: clave,
      Body: png,
      ContentType: "image/png",
    })
  );
  return clave;
}

export async function eliminarFirma(clave: string): Promise<void> {
  if (!clave) return;
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: clave }));
}

// Lectura de la firma para servirla desde el visor autenticado
// (openspec/changes/visor-firma-servida-por-la-app): el navegador nunca habla
// con el almacenamiento, así que el visor no depende de que su endpoint sea
// alcanzable desde el cliente. Devuelve `null` cuando el objeto no existe, para
// que el visor responda "no encontrado" en vez de un error interno.
export interface FirmaLeida {
  bytes: Uint8Array;
  contentType: string;
}

export async function leerFirma(claveFirma: string): Promise<FirmaLeida | null> {
  if (!claveFirma.trim()) return null;
  try {
    const objeto = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: claveFirma })
    );
    const bytes = await objeto.Body?.transformToByteArray();
    if (!bytes) return null;
    return {
      bytes,
      contentType: objeto.ContentType ?? CONTENIDO_FIRMA_POR_DEFECTO,
    };
  } catch (error) {
    if (esObjetoAusente(error)) return null;
    throw error;
  }
}

// El almacenamiento responde 404 con `NoSuchKey` cuando la clave ya no existe
// (firma huérfana); cualquier otro fallo es un error del servicio.
function esObjetoAusente(error: unknown): boolean {
  const fallo = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    fallo?.name === "NoSuchKey" ||
    fallo?.name === "NotFound" ||
    fallo?.$metadata?.httpStatusCode === 404
  );
}