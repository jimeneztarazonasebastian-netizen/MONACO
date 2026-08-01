"use client";

import { useActionState } from "react";

import { AreaTexto, Aviso, BotonEnviar, Campo } from "@/components/ui/campos";
import { guardarConfiguracion } from "@/lib/actions/configuracion";
import { ESTADO_INICIAL } from "@/lib/actions/estado";
import type { ConfiguracionTienda } from "@/types/database";

export function FormularioConfiguracion({
  ajustes,
}: {
  ajustes: ConfiguracionTienda;
}) {
  const [estado, accion] = useActionState(guardarConfiguracion, ESTADO_INICIAL);
  const v = estado.valores;

  return (
    <form action={accion} className="flex flex-col gap-6">
      <Campo
        etiqueta="Nombre de la tienda"
        name="store_name"
        defaultValue={v?.store_name ?? ajustes.store_name}
        ayuda="Es lo que encabeza la tirilla"
        required
      />

      <Campo
        etiqueta="WhatsApp"
        name="whatsapp"
        inputMode="tel"
        placeholder="300 123 4567"
        defaultValue={v?.whatsapp ?? ajustes.whatsapp ?? ""}
        ayuda="A este número llegan los pedidos del catálogo. Sin él, el cliente no puede confirmar."
      />

      <Campo
        etiqueta="Dirección"
        name="address"
        defaultValue={v?.address ?? ajustes.address ?? ""}
        placeholder="Calle 36 # 20-15, Bucaramanga"
      />

      <Campo
        etiqueta="Horario"
        name="schedule"
        defaultValue={v?.schedule ?? ajustes.schedule ?? ""}
        placeholder="Lunes a sábado, 9:00 a 19:00"
      />

      <AreaTexto
        etiqueta="Pie de la tirilla"
        name="receipt_footer"
        defaultValue={v?.receipt_footer ?? ajustes.receipt_footer ?? ""}
        placeholder="Cambios dentro de los 8 días con esta tirilla."
      />

      <Aviso>{estado.error}</Aviso>
      {estado.ok && !estado.error ? (
        <p className="text-sm text-gris">Guardado.</p>
      ) : null}

      <div>
        <BotonEnviar>Guardar</BotonEnviar>
      </div>
    </form>
  );
}
