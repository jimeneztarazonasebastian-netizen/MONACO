import type { Metadata } from "next";

import { Pendiente } from "@/components/admin/Pendiente";
import { exigirSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Ventas" };

export default async function PaginaVentas() {
  await exigirSesion();

  return (
    <Pendiente
      titulo="Ventas"
      descripcion="Historial de ventas con reimpresión de tirilla y anulación. Lee de sales y sale_items, que congelan nombre, SKU y precio del momento de la venta."
      paso="paso 4"
    />
  );
}
