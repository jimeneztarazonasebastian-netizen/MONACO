import type { Metadata } from "next";

import { Pendiente } from "@/components/admin/Pendiente";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Pedidos web" };

export default async function PaginaPedidos() {
  await exigirAdmin();

  return (
    <Pendiente
      titulo="Pedidos web"
      descripcion="Bandeja de pedidos que llegaron por el catálogo. Entran como pendiente y no descuentan inventario: el stock se mueve cuando el dueño confirma con confirm_web_order, después de cerrar la venta por chat."
      paso="paso 6"
    />
  );
}
