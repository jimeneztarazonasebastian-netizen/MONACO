import type { Metadata } from "next";

import { FormularioConfiguracion } from "@/components/admin/FormularioConfiguracion";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { esNumeroValido } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Configuración" };

export default async function PaginaConfiguracion() {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const { data: ajustes } = await supabase
    .from("store_settings")
    .select("*")
    .eq("id", true)
    .single();

  if (!ajustes) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-10">
        <p className="border-l-2 border-rojo bg-rojo/10 px-4 py-3 text-sm">
          No se encontró la fila de configuración. Debería crearla la migración
          0001; revisa que se haya aplicado completa.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="fuente-display mb-3 text-2xl">Configuración</h1>
      <p className="mb-8 text-sm leading-relaxed text-gris">
        De aquí salen el encabezado de la tirilla, el pie del catálogo y el
        número al que llegan los pedidos web. Nada de esto va escrito en el
        código.
      </p>

      {!esNumeroValido(ajustes.whatsapp) ? (
        <p className="bisel-sm mb-8 border-l-2 border-rojo bg-rojo/10 px-4 py-3 text-sm">
          Falta el número de WhatsApp. Sin él, el botón de confirmar pedido del
          catálogo no funciona y los clientes no pueden cerrar la compra.
        </p>
      ) : null}

      <FormularioConfiguracion ajustes={ajustes} />
    </section>
  );
}
