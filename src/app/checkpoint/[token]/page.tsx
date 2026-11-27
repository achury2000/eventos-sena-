import { prisma } from "@/lib/prisma";
import { FormAutoregistro } from "./form-autoregistro";

export default async function PaginaCheckpoint({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const checkpoint = await prisma.checkpoint.findUnique({
    where: { codigoQr: token },
    include: { evento: true },
  });

  if (!checkpoint) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md space-y-2 rounded-2xl border bg-card p-8 text-center shadow-xl">
          <h1 className="text-xl font-semibold">Enlace no válido</h1>
          <p className="text-sm text-muted-foreground">
            Este código QR no corresponde a ningún checkpoint. Verifica con el
            personal del evento.
          </p>
        </div>
      </main>
    );
  }

  if (!checkpoint.activo) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md space-y-2 rounded-2xl border bg-card p-8 text-center shadow-xl">
          <h1 className="text-xl font-semibold">Checkpoint desactivado</h1>
          <p className="text-sm text-muted-foreground">
            Este punto de control está desactivado ({checkpoint.nombre} ·{" "}
            {checkpoint.evento.nombre}). Solicita apoyo al personal del evento.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <FormAutoregistro
        token={token}
        checkpointNombre={checkpoint.nombre}
        eventoNombre={checkpoint.evento.nombre}
      />
    </main>
  );
}