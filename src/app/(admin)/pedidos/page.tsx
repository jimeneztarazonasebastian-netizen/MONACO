import type { Metadata } from "next";

import { TarjetaPedido, type Pedido } from "@/components/admin/TarjetaPedido";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { plural } from "@/lib/texto";

export const metadata: Metadata = { title: "Pedidos web" };

const SELECCION =
  "id, number, status, total, created_at, notes, customers(full_name, phone, address), sale_items(id, product_name, size, color, quantity, unit_price)";

export default async function PaginaPedidos() {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const [{ data: pendientes }, { data: procesados }] = await Promise.all([
    supabase
      .from("sales")
      .select(SELECCION)
      .eq("channel", "web")
      .eq("status", "pendiente")
      .order("created_at", { ascending: false }),
    supabase
      .from("sales")
      .select(SELECCION)
      .eq("channel", "web")
      .neq("status", "pendiente")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="fuente-display mb-3 text-2xl">Pedidos web</h1>
      <p className="mb-10 max-w-2xl text-sm leading-relaxed text-gris">
        Los pedidos del catálogo entran aquí sin tocar el inventario. El stock
        se mueve cuando confirmas, no antes: así nadie puede vaciar la bodega
        desde internet sin comprar nada.
      </p>

      {pendientes && pendientes.length > 0 ? (
        <>
          <h2 className="fuente-display mb-5 text-sm">
            Por confirmar · {plural(pendientes.length, "pedido", "pedidos")}
          </h2>
          <div className="mb-14 grid gap-4 lg:grid-cols-2">
            {pendientes.map((p) => (
              <TarjetaPedido key={p.id} pedido={p as unknown as Pedido} />
            ))}
          </div>
        </>
      ) : (
        <p className="mb-14 text-sm text-gris">
          No hay pedidos pendientes. Aquí caerán los que lleguen por el
          catálogo, con el nombre y el teléfono de quien los hizo.
        </p>
      )}

      {procesados && procesados.length > 0 ? (
        <>
          <h2 className="fuente-display mb-5 text-sm">Ya procesados</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {procesados.map((p) => (
              <TarjetaPedido key={p.id} pedido={p as unknown as Pedido} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
