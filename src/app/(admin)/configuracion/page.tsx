import type { Metadata } from "next";

import { Pendiente } from "@/components/admin/Pendiente";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Configuración" };

export default async function PaginaConfiguracion() {
  await exigirAdmin();

  return (
    <Pendiente
      titulo="Configuración"
      descripcion="Fila única de store_settings: número de WhatsApp, dirección, horario y pie de la tirilla. Nada de esto va quemado en el código."
      paso="paso 4"
    />
  );
}
