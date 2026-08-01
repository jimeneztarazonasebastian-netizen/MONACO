"use server";

import { revalidatePath } from "next/cache";

import type { EstadoFormulario } from "@/lib/actions/estado";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { aTexto } from "@/lib/texto";
import { esNumeroValido } from "@/lib/whatsapp";

const CAMPOS = [
  "store_name",
  "slogan",
  "whatsapp",
  "address",
  "schedule",
  "receipt_footer",
];

export async function guardarConfiguracion(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const valores: Record<string, string> = {};
  for (const campo of CAMPOS) valores[campo] = aTexto(formData.get(campo));

  if (!valores.store_name) {
    return { error: "La tienda necesita un nombre.", valores };
  }

  // El número es lo único que se valida de verdad: de él depende que el
  // checkout del catálogo pueda abrir un chat. Si está mal, los pedidos
  // se pierden en silencio.
  if (valores.whatsapp && !esNumeroValido(valores.whatsapp)) {
    return {
      error: "Ese número de WhatsApp no parece válido. Escribe el celular completo.",
      valores,
    };
  }

  const { error } = await supabase
    .from("store_settings")
    .update({
      store_name: valores.store_name,
      slogan: valores.slogan || null,
      whatsapp: valores.whatsapp || null,
      address: valores.address || null,
      schedule: valores.schedule || null,
      receipt_footer: valores.receipt_footer || null,
    })
    .eq("id", true);

  if (error) return { error: `No se pudo guardar: ${error.message}`, valores };

  // La tirilla, el pie del catálogo y el checkout leen de aquí.
  revalidatePath("/", "layout");
  return { error: null, ok: true };
}
