import type { Metadata } from "next";

import { ContenidoCarrito } from "@/components/tienda/ContenidoCarrito";

// El carrito vive en localStorage, así que la pantalla en sí es de
// cliente. Esta envoltura de servidor existe solo para poder ponerle
// título a la pestaña: un componente cliente no puede exportar metadata.
export const metadata: Metadata = { title: "Tu carrito" };

export default function PaginaCarrito() {
  return <ContenidoCarrito />;
}
