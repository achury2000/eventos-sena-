import { requireAdmin } from "@/lib/actions/admin/guard";
import { FormUsuario } from "../form-usuario";

type SearchParams = { rol?: string };

export default async function NuevoUsuarioPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const rolInicial = sp.rol === "ADMINISTRADOR" ? "ADMINISTRADOR" : "OPERADOR";

  return (
    <section className="flex max-w-xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Crear Usuario</h2>
      <FormUsuario rolInicial={rolInicial} />
    </section>
  );
}
