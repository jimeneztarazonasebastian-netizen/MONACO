import type { Metadata } from "next";

import { ContenidoCarrito } from "@/components/tienda/ContenidoCarrito";
import { crearClienteServidor } from "@/lib/supabase/server";

// El carrito vive en localStorage, así que la pantalla es de cliente.
// Esta envoltura de servidor le pone título a la pestaña y le baja el
// número de WhatsApp, que sale de store_settings y nunca del código.
export const metadata: Metadata = { title: "Tu carrito" };

export default async function PaginaCarrito() {
  const supabase = await crearClienteServidor();

  const { data: tienda } = await supabase
    .from("store_settings")
    .select("whatsapp")
    .maybeSingle();

  return <ContenidoCarrito whatsappTienda={tienda?.whatsapp ?? null} />;
}
