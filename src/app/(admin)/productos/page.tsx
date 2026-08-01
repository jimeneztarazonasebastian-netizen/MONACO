import type { Metadata } from "next";

import { Pendiente } from "@/components/admin/Pendiente";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Productos" };

export default async function PaginaProductos() {
  await exigirAdmin();

  return (
    <Pendiente
      titulo="Productos"
      descripcion="Alta y edición de prendas y de sus variantes de talla y color, con carga de imágenes a Storage. El stock vive en las variantes, nunca en el producto."
      paso="paso 3"
    />
  );
}
