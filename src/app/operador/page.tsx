import { requireOperador } from "@/lib/actions/operador/guard";
import { cargarTableroOperador } from "@/lib/operador/tablero";
import { PanelOperador } from "./panel-operador";

export default async function OperadorPage() {
  const session = await requireOperador();
  const tablero = await cargarTableroOperador(session.user.id);

  return <PanelOperador tableroInicial={tablero} />;
}
