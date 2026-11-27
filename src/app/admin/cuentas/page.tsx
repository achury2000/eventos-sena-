import Link from "next/link";
import { ActionForm } from "@/components/admin/action-form";
import { BotonRestablecerClave } from "@/components/admin/boton-restablecer-clave";
import { Button } from "@/components/ui/button";
import { eliminarUsuario } from "@/lib/actions/admin/usuarios";
import { requireAdmin } from "@/lib/actions/admin/guard";
import { ETIQUETA_AFILIACION, formatearFecha } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

// Pestañas de la sección Cuentas: cada pestaña gestiona UN rol. El rol viaja
// como searchParam validado contra el set permitido; nunca se confía en un
// valor arbitrario para el query ni para la acción de eliminación.
const ROLES_PESTANA = ["OPERADOR", "ADMINISTRADOR"] as const;
type RolPestana = (typeof ROLES_PESTANA)[number];

type SearchParams = { rol?: string };

export default async function CuentasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireAdmin();

  const sp = await searchParams;
  const rol: RolPestana =
    sp.rol === "ADMINISTRADOR" ? "ADMINISTRADOR" : "OPERADOR";

  const usuarios = await prisma.usuario.findMany({
    where: { rol },
    orderBy: { creadoEn: "desc" },
  });

  const esEspecial = rol === "ADMINISTRADOR";
  const sustantivo = esEspecial ? "Administrador" : "Operador";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Usuarios de la plataforma. Las crea el Administrador; no hay
          autorregistro.
        </p>
        <Link href={`/admin/cuentas/nuevo?rol=${rol}`}>
          <Button>Crear {sustantivo}</Button>
        </Link>
      </div>

      <div className="flex gap-2 text-sm">
        {ROLES_PESTANA.map((r) => {
          const activa = r === rol;
          return (
            <Link
              key={r}
              href={`/admin/cuentas?rol=${r}`}
              className={
                activa
                  ? "rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground"
                  : "rounded-lg bg-muted/40 px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted"
              }
            >
              {r === "ADMINISTRADOR" ? "Administradores" : "Operadores"}
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Documento</th>
              <th className="px-4 py-3 font-medium">Correo</th>
              <th className="px-4 py-3 font-medium">Afiliación</th>
              <th className="px-4 py-3 font-medium">Centro</th>
              <th className="px-4 py-3 font-medium">Creado</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  {esEspecial
                    ? "Aún no hay Administradores. Crea el primero."
                    : "Aún no hay Operadores. Crea el primero."}
                </td>
              </tr>
            ) : (
              usuarios.map((u) => {
                const esSesionActual =
                  esEspecial && u.id === session.user.id;
                return (
                  <tr key={u.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{u.nombreCompleto}</td>
                    <td className="px-4 py-3">{u.documento}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{ETIQUETA_AFILIACION[u.tipoAfiliacion]}</td>
                    <td className="px-4 py-3">
                      {u.centroFormacion ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatearFecha(u.creadoEn)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <BotonRestablecerClave
                          id={u.id}
                          nombre={u.nombreCompleto}
                        />
                        {esSesionActual ? (
                          <span className="text-xs text-muted-foreground">
                            (tu cuenta)
                          </span>
                        ) : (
                          <ActionForm
                            action={eliminarUsuario}
                            hidden={{ id: u.id, rol }}
                            confirmText={
                              esEspecial
                                ? "¿Eliminar esta cuenta de Administrador?"
                                : "¿Eliminar este Operador?"
                            }
                          >
                            <Button
                              type="submit"
                              variant="destructive"
                              size="sm"
                            >
                              Eliminar
                            </Button>
                          </ActionForm>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}