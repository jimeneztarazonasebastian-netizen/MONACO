import type { Metadata } from "next";
import Link from "next/link";

import { GestorCategorias } from "@/components/admin/GestorCategorias";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Categorías" };

export default async function PaginaCategorias() {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const { data: categorias } = await supabase
    .from("categories")
    .select("id, name, is_active, parent_id")
    .order("position")
    .order("name");

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/productos"
        className="mb-6 inline-block text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:text-blanco"
      >
        ← Productos
      </Link>

      <h1 className="fuente-display mb-3 text-2xl">Categorías</h1>
      <p className="mb-8 text-sm text-gris">
        Se archivan, no se borran: una categoría borrada dejaría huérfanas las
        prendas que la usan.
      </p>

      <GestorCategorias categorias={categorias ?? []} />
    </section>
  );
}
