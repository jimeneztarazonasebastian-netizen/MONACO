"use server";

import { revalidatePath } from "next/cache";

import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Saca variantes de la cola de etiquetas.
 *
 * Se marca después de imprimir, no antes: si la impresora se traba, la
 * prenda tiene que seguir apareciendo en la cola. Peor que imprimir dos
 * veces es creer que ya se imprimió.
 */
export async function marcarEtiquetasImpresas(ids: string[]) {
  await exigirAdmin();
  if (ids.length === 0) return;

  const supabase = await crearClienteServidor();
  await supabase
    .from("product_variants")
    .update({ label_printed: true })
    .in("id", ids);

  revalidatePath("/inventario");
}

/** Devuelve una variante a la cola, por si la etiqueta salió mal. */
export async function devolverALaCola(id: string) {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  await supabase
    .from("product_variants")
    .update({ label_printed: false })
    .eq("id", id);

  revalidatePath("/inventario");
}
