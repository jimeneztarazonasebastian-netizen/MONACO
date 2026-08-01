"use server";

import { revalidatePath } from "next/cache";

import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { MetodoPago } from "@/types/database";

export type ItemPedido = { variant_id: string; quantity: number };

export type ClientePedido = {
  full_name: string;
  phone: string;
  address?: string;
};

export type ResultadoPedido =
  | { ok: true; numero: string; ventaId: string }
  | { ok: false; error: string };

export type EstadoVariante = { precio: number; stock: number };

/**
 * Estado actual de lo que el cliente lleva en el carrito.
 *
 * El carrito web vive en localStorage y puede tener días. En ese tiempo
 * la prenda pudo archivarse, agotarse o cambiar de precio, y el cliente
 * seguiría viendo la foto de un pedido que ya no existe. Sin esto, el
 * error aparece recién al confirmar, en forma de "una de las prendas ya
 * no está disponible" sin decir cuál.
 *
 * Devuelve null para las que ya no se pueden vender.
 */
export async function revisarCarrito(
  variantIds: string[],
): Promise<Record<string, EstadoVariante | null>> {
  if (variantIds.length === 0) return {};

  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("product_variants")
    .select("id, sale_price, stock, products!inner(is_active)")
    .in("id", variantIds)
    .eq("is_active", true)
    .eq("products.is_active", true);

  const vivas = new Map(
    (data ?? []).map((v) => [v.id, { precio: v.sale_price, stock: v.stock }]),
  );

  return Object.fromEntries(
    variantIds.map((id) => [id, vivas.get(id) ?? null]),
  );
}

/**
 * Pedido desde el catálogo público.
 *
 * A propósito NO exige sesión: quien compra es un visitante anónimo.
 * `create_web_order` está concedida al rol `anon` justamente para esto,
 * y es la única función que lo está.
 *
 * No descuenta inventario. Si lo hiciera, cualquiera podría vaciar el
 * stock visible desde internet sin comprar nada.
 */
export async function crearPedidoWeb(
  items: ItemPedido[],
  cliente: ClientePedido,
): Promise<ResultadoPedido> {
  const supabase = await crearClienteServidor();

  if (items.length === 0) return { ok: false, error: "Tu carrito está vacío." };
  if (!cliente.full_name.trim() || !cliente.phone.trim()) {
    return { ok: false, error: "Necesitamos tu nombre y tu teléfono." };
  }

  const { data, error } = await supabase.rpc("create_web_order", {
    p_items: items,
    p_customer: cliente,
  });

  if (error) {
    // Los mensajes de la función ya están escritos para el cliente
    // final ("Solo quedan 2 de Camiseta talla M"), así que se pasan tal
    // cual en vez de taparlos con un genérico.
    if (error.message.includes("Solo quedan")) {
      return { ok: false, error: error.message };
    }
    if (error.message.includes("ya no está disponible")) {
      return { ok: false, error: "Una de las prendas ya no está disponible." };
    }
    return { ok: false, error: "No pudimos registrar el pedido. Intenta de nuevo." };
  }

  const venta = data as unknown as { id: string; number: string };

  revalidatePath("/pedidos");
  return { ok: true, numero: venta.number, ventaId: venta.id };
}

/**
 * El dueño cerró la venta por chat y la confirma.
 *
 * Aquí sí se descuenta el stock, con el mismo bloqueo que usa el POS: si
 * la última talla M se vendió en el mostrador mientras se hablaba por
 * WhatsApp, esto falla en vez de dejar el inventario en negativo.
 */
export async function confirmarPedido(
  ventaId: string,
  metodo: MetodoPago,
): Promise<{ ok: boolean; error?: string }> {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const { error } = await supabase.rpc("confirm_web_order", {
    p_sale_id: ventaId,
    p_method: metodo,
  });

  if (error) {
    if (error.message.includes("Ya no hay stock")) {
      return { ok: false, error: error.message };
    }
    if (error.message.includes("ya está en estado")) {
      return { ok: false, error: "Ese pedido ya fue procesado." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/pedidos");
  revalidatePath("/productos");
  revalidatePath("/inventario");
  return { ok: true };
}

/** Cancela un pedido web que no se concretó. No toca inventario. */
export async function anularPedido(ventaId: string) {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  await supabase
    .from("sales")
    .update({ status: "anulada", voided_at: new Date().toISOString() })
    .eq("id", ventaId)
    .eq("status", "pendiente");

  revalidatePath("/pedidos");
}
