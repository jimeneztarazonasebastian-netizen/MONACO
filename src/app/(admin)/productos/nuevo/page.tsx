import type { Metadata } from "next";
import Link from "next/link";

import { FormularioNuevoProducto } from "@/components/admin/FormularioNuevoProducto";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nueva prenda" };

export default async function PaginaNuevoProducto() {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const { data: categorias } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("position")
    .order("name");

  return (
    <section className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/productos"
        className="mb-6 inline-block text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:text-blanco"
      >
        ← Productos
      </Link>

      <h1 className="fuente-display mb-8 text-2xl">Nueva prenda</h1>

      <FormularioNuevoProducto categorias={categorias ?? []} />
    </section>
  );
}
