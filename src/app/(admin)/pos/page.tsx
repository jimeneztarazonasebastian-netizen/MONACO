import type { Metadata } from "next";

import { Pendiente } from "@/components/admin/Pendiente";
import { exigirSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Caja POS" };

export default async function PaginaPos() {
  await exigirSesion();

  return (
    <Pendiente
      titulo="Caja POS"
      descripcion="La pantalla de venta en mostrador: lector de código de barras, carrito, cobro con métodos combinados y tirilla de 58 mm. Es el módulo que se usa desde el primer día, así que va antes que el catálogo."
      paso="paso 4"
    />
  );
}
