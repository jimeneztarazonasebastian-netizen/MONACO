import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FormularioEditarProducto } from "@/components/admin/FormularioEditarProducto";
import { GestorImagenes } from "@/components/admin/GestorImagenes";
import { VariantesProducto } from "@/components/admin/VariantesProducto";
import { cambiarEstadoProducto } from "@/lib/actions/productos";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Editar prenda" };

function Bloque({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-humo pt-8">
      <h2 className="fuente-display mb-6 text-sm">{titulo}</h2>
      {children}
    </section>
  );
}

export default async function PaginaEditarProducto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirAdmin();
  const { id } = await params;
  const supabase = await crearClienteServidor();

  const [{ data: producto }, { data: variantes }, { data: categorias }] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", id).single(),
      supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", id)
        .order("size")
        .order("color"),
      supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
    ]);

  if (!producto) notFound();

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
      <div>
        <Link
          href="/productos"
          className="mb-6 inline-block text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:text-blanco"
        >
          ← Productos
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="fuente-display text-2xl">{producto.name}</h1>
            {!producto.is_active ? (
              <p className="mt-2 text-xs tracking-[0.16em] text-rojo uppercase">
                Archivado — no aparece en el catálogo ni en la caja
              </p>
            ) : null}
          </div>

          <form
            action={cambiarEstadoProducto.bind(null, id, !producto.is_active)}
          >
            <button
              type="submit"
              className="bisel-sm h-12 border border-humo px-5 text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
            >
              {producto.is_active ? "Archivar prenda" : "Reactivar prenda"}
            </button>
          </form>
        </div>
      </div>

      <FormularioEditarProducto
        producto={producto}
        categorias={categorias ?? []}
      />

      <Bloque titulo="Fotos">
        <GestorImagenes productoId={id} imagenes={producto.images ?? []} />
      </Bloque>

      <Bloque titulo="Variantes">
        <VariantesProducto productoId={id} variantes={variantes ?? []} />
      </Bloque>
    </section>
  );
}
