import type { Metadata } from "next";
import Link from "next/link";

import {
  ColaEtiquetas,
  type VariantePendiente,
} from "@/components/admin/ColaEtiquetas";
import { fechaHora, pesos } from "@/lib/formato";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { plural } from "@/lib/texto";

export const metadata: Metadata = { title: "Inventario" };

const VISTAS = [
  { clave: "stock", etiqueta: "Stock bajo" },
  { clave: "etiquetas", etiqueta: "Etiquetas por imprimir" },
  { clave: "kardex", etiqueta: "Kardex" },
] as const;

const NOMBRE_MOVIMIENTO: Record<string, string> = {
  venta: "Venta",
  devolucion: "Devolución",
  entrada: "Entrada",
  ajuste: "Ajuste",
  merma: "Merma",
};

export default async function PaginaInventario({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  await exigirAdmin();
  const { ver } = await searchParams;
  const vista = VISTAS.some((v) => v.clave === ver) ? ver : "stock";
  const supabase = await crearClienteServidor();

  const [{ data: bajo }, { data: etiquetas }, { count: pendientes }] =
    await Promise.all([
      supabase.from("v_low_stock").select("*"),
      vista === "etiquetas"
        ? supabase.from("v_labels_pending").select("*")
        : Promise.resolve({ data: null }),
      // El contador sale de la misma vista que la lista. Contarlo por
      // separado sobre product_variants es cómo terminó marcando 1
      // cuando la lista mostraba 0: la vista descarta las prendas
      // archivadas y la consulta suelta no.
      supabase.from("v_labels_pending").select("*", { count: "exact", head: true }),
    ]);

  // La etiqueta lleva la marca, así que necesita el nombre y el eslogan.
  const { data: tienda } =
    vista === "etiquetas"
      ? await supabase
          .from("store_settings")
          .select("store_name, slogan")
          .maybeSingle()
      : { data: null };

  const { data: movimientos } =
    vista === "kardex"
      ? await supabase
          .from("inventory_movements")
          .select(
            "id, type, quantity, stock_after, note, created_at, product_variants(size, color, products(name)), profiles(full_name)",
          )
          .order("created_at", { ascending: false })
          .limit(100)
      : { data: null };

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="fuente-display mb-6 text-2xl">Inventario</h1>

      <nav aria-label="Vistas de inventario" className="mb-8 flex flex-wrap gap-1">
        {VISTAS.map((v) => {
          const activa = v.clave === vista;
          return (
            <Link
              key={v.clave}
              href={`/inventario?ver=${v.clave}`}
              aria-current={activa ? "page" : undefined}
              className={`px-4 py-3 text-xs tracking-[0.16em] uppercase transition-colors ${
                activa
                  ? "bg-humo text-blanco"
                  : "text-gris hover:bg-carbon hover:text-blanco"
              }`}
            >
              {v.etiqueta}
              {v.clave === "etiquetas" && pendientes ? (
                <span className="ml-2 text-rojo">{pendientes}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {vista === "stock" ? (
        bajo && bajo.length > 0 ? (
          <>
            <p className="mb-6 text-sm text-gris">
              {plural(bajo.length, "variante", "variantes")} en el umbral de
              aviso o por debajo. El umbral se ajusta en cada variante, dentro
              de la prenda.
            </p>
            <ul className="flex flex-col">
              {bajo.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-4 border-b border-humo py-4"
                >
                  <span>
                    <span className="block text-sm text-blanco">{v.product}</span>
                    <span className="block font-mono text-xs text-gris">
                      {v.size} · {v.color} · {v.sku}
                    </span>
                  </span>
                  <span className="flex items-baseline gap-6">
                    <span className="font-mono text-sm text-gris">
                      {pesos(v.sale_price)}
                    </span>
                    <span
                      className={`font-mono text-lg ${v.stock === 0 ? "text-rojo" : "text-blanco"}`}
                    >
                      {v.stock === 0 ? "agotada" : `${v.stock} · avisa en ${v.low_stock_threshold}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-gris">
            Ninguna variante está en el umbral de aviso. Aquí aparecerán las
            prendas que se estén acabando, antes de que un cliente se lleve la
            sorpresa.
          </p>
        )
      ) : null}

      {vista === "etiquetas" ? (
        <ColaEtiquetas
          pendientes={(etiquetas ?? []) as VariantePendiente[]}
          nombreTienda={tienda?.store_name ?? "Mónaco"}
          slogan={tienda?.slogan ?? null}
        />
      ) : null}

      {vista === "kardex" ? (
        movimientos && movimientos.length > 0 ? (
          <>
            <p className="mb-6 text-sm text-gris">
              {plural(movimientos.length, "movimiento", "movimientos")}. Toda
              entrada y salida de stock deja rastro aquí: si el inventario no
              cuadra, la respuesta está en esta lista.
            </p>
            <ul className="flex flex-col">
              {movimientos.map((m) => {
                const variante = m.product_variants as unknown as {
                  size: string;
                  color: string;
                  products: { name: string };
                } | null;
                const quien = (m.profiles as unknown as { full_name: string } | null)
                  ?.full_name;
                const entra = m.quantity > 0;

                return (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-4 border-b border-humo py-4"
                  >
                    <span className="min-w-56 flex-1">
                      <span className="block text-sm text-blanco">
                        {variante?.products.name ?? "Prenda eliminada"}
                        {variante ? (
                          <span className="text-gris">
                            {" "}
                            · {variante.size} · {variante.color}
                          </span>
                        ) : null}
                      </span>
                      <span className="block text-xs text-gris">
                        {NOMBRE_MOVIMIENTO[m.type] ?? m.type}
                        {m.note ? ` — ${m.note}` : ""}
                        {quien ? ` · ${quien}` : ""}
                      </span>
                    </span>
                    <span className="flex items-baseline gap-6 font-mono text-sm">
                      <span className="text-xs text-gris">
                        {fechaHora(m.created_at)}
                      </span>
                      <span className={entra ? "text-blanco" : "text-rojo"}>
                        {entra ? "+" : ""}
                        {m.quantity}
                      </span>
                      <span className="w-16 text-right text-gris">
                        quedó {m.stock_after}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="text-sm text-gris">
            Todavía no hay movimientos. Aquí quedará registrada cada entrada de
            mercancía, cada venta, cada merma y cada conteo.
          </p>
        )
      ) : null}
    </section>
  );
}
