import { requireAdmin } from "@/lib/actions/admin/guard";
import { FormEvento } from "../form-evento";

export default async function NuevoEventoPage() {
  await requireAdmin();

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Crear Evento</h2>
      <FormEvento />
    </section>
  );
}