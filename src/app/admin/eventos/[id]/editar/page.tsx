import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/actions/admin/guard";
import { prisma } from "@/lib/prisma";
import { FormEvento } from "../../form-evento";

export default async function EditarEventoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  const evento = await prisma.evento.findUnique({ where: { id } });
  if (!evento) {
    notFound();
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Editar Evento</h2>
      <FormEvento evento={evento} />
    </section>
  );
}