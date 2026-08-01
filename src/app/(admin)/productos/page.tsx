import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { primeraImagen } from "@/lib/imagenes";
import { pesos } from "@/lib/formato";
import { plural } from "@/lib/texto";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Productos" };

type Variante = { sale_price: number; stock: number; is_active: boolean };

export default async function PaginaProductos({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  await exigirAdmin();
  const { q, estado } = await searchParams;
  const supabase = await crearClienteServidor();

  let consulta = supabase
    .from("products")
    .select(
      "id, name, images, is_active, is_featured, categories(name), product_variants(sale_price, stock, is_active)",
    )
    .order("created_at", { ascending: false });

  if (q) consulta = consulta.ilike("name", `%${q}%`);
  if (estado === "archivados") consulta = consulta.eq("is_active", false);
  else if (estado !== "todos") consulta = consulta.eq("is_active", true);

  const { data: productos, error } = await consulta;

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="fuente-display text-2xl">Productos</h1>
        <div className="flex gap-3">
          <Link
            href="/productos/categorias"
            className="bisel-sm flex h-12 items-center border border-humo px-5 text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
          >
            Categorías
          </Link>
          <Link
            href="/productos/nuevo"
            className="bisel-sm flex h-12 items-center bg-rojo px-5 text-xs font-semibold tracking-[0.16em] text-blanco uppercase transition-opacity hover:opacity-90"
          >
            Nueva prenda
          </Link>
        </div>
      </div>

      <form className="mb-8 flex flex-wrap gap-3">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre…"
          className="h-12 min-w-56 flex-1 border border-humo bg-carbon px-4 text-base text-blanco placeholder:text-gris focus:border-gris focus:outline-none"
        />
        <select
          name="estado"
          defaultValue={estado ?? "activos"}
          className="h-12 border border-humo bg-carbon px-3 text-base text-blanco focus:border-gris focus:outline-none"
        >
          <option value="activos">Activos</option>
          <option value="archivados">Archivados</option>
          <option value="todos">Todos</option>
        </select>
        <button
          type="submit"
          className="bisel-sm h-12 border border-humo px-6 text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
        >
          Buscar
        </button>
      </form>

      {error ? (
        <p className="border-l-2 border-rojo bg-rojo/10 px-4 py-3 text-sm">
          No se pudo cargar el catálogo: {error.message}
        </p>
      ) : null}

      {productos && productos.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {productos.map((producto) => {
            const variantes = (producto.product_variants ?? []) as Variante[];
            const activas = variantes.filter((v) => v.is_active);
            const precios = activas.map((v) => v.sale_price);
            const stock = activas.reduce((suma, v) => suma + v.stock, 0);
            const foto = primeraImagen(producto.images);
            const categoria = (
              producto.categories as { name: string } | null
            )?.name;

            return (
              <li key={producto.id}>
                <Link
                  href={`/productos/${producto.id}`}
                  className="bisel group block h-full border border-humo bg-carbon transition-colors hover:border-gris"
                >
                  <div className="relative aspect-4/5 overflow-hidden bg-negro">
                    {foto ? (
                      <Image
                        src={foto}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xs tracking-[0.16em] text-gris uppercase">
                        Sin foto
                      </span>
                    )}
                    {!producto.is_active ? (
                      <span className="absolute top-3 left-3 bg-humo px-2 py-1 text-[10px] tracking-[0.16em] text-gris uppercase">
                        Archivado
                      </span>
                    ) : null}
                    {stock === 0 && producto.is_active ? (
                      <span className="absolute top-3 right-3 bg-rojo px-2 py-1 text-[10px] tracking-[0.16em] text-blanco uppercase">
                        Agotado
                      </span>
                    ) : null}
                  </div>

                  <div className="p-4">
                    <p className="mb-1 truncate text-sm text-blanco">
                      {producto.name}
                    </p>
                    <p className="mb-3 text-xs text-gris">
                      {categoria ?? "Sin categoría"}
                    </p>
                    <p className="font-mono text-sm text-blanco">
                      {precios.length === 0
                        ? "Sin variantes"
                        : Math.min(...precios) === Math.max(...precios)
                          ? pesos(precios[0])
                          : `desde ${pesos(Math.min(...precios))}`}
                    </p>
                    <p className="mt-1 font-mono text-xs text-gris">
                      {plural(activas.length, "variante", "variantes")} ·{" "}
                      {plural(stock, "unidad", "unidades")} en bodega
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : !error ? (
        <div className="bisel border border-humo bg-carbon p-8 text-center">
          <p className="mb-2 text-blanco">
            {q ? "Ninguna prenda coincide con esa búsqueda." : "Todavía no hay prendas."}
          </p>
          <p className="text-sm text-gris">
            {q ? (
              "Prueba con otra palabra."
            ) : (
              <>
                Crea la primera con <strong className="text-blanco">Nueva prenda</strong>.
              </>
            )}
          </p>
        </div>
      ) : null}
    </section>
  );
}
