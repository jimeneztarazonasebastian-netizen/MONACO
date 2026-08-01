import type { Metadata } from "next";

import { Pendiente } from "@/components/admin/Pendiente";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Inventario" };

export default async function PaginaInventario() {
  await exigirAdmin();

  return (
    <Pendiente
      titulo="Inventario"
      descripcion="Kardex, entradas de mercancía, conteos y mermas vía adjust_stock, más stock bajo y la cola de etiquetas por imprimir (v_labels_pending)."
      paso="paso 3"
    />
  );
}
