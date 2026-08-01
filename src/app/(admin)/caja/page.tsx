import type { Metadata } from "next";

import { Pendiente } from "@/components/admin/Pendiente";
import { exigirSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Turno de caja" };

export default async function PaginaCaja() {
  await exigirSesion();

  return (
    <Pendiente
      titulo="Turno de caja"
      descripcion="Apertura con base inicial, arqueo y cierre. Llama a open_cash_session, cash_session_summary y close_cash_session. Solo el efectivo cuadra contra el conteo físico; lo demás se informa aparte."
      paso="paso 4"
    />
  );
}
