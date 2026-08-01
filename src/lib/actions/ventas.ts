"use server";

import { revalidatePath } from "next/cache";

import { exigirSesion } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { MetodoPago } from "@/types/database";

export type VarianteEncontrada = {
  variant_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  barcode: string;
  size: string;
  color: string;
  sale_price: number;
  stock: number;
  images: string[];
};

/** Lo que dispara la pistola. Un solo resultado o ninguno. */
export async function buscarPorCodigo(
  codigo: string,
): Promise<{ variante: VarianteEncontrada | null; error: string | null }> {
  await exigirSesion();
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.rpc("find_by_barcode", {
    p_code: codigo.trim(),
  });

  if (error) return { variante: null, error: error.message };
  const variante = (data as VarianteEncontrada[] | null)?.[0] ?? null;

  if (!variante) {
    return { variante: null, error: `Ningún producto con el código ${codigo}.` };
  }
  return { variante, error: null };
}

/**
 * Búsqueda por nombre para cuando la etiqueta está rota, la prenda no
 * tiene código encima o el cliente pregunta por algo que no tiene en la
 * mano. En una caja siempre hace falta la salida manual.
 */
export async function buscarPorNombre(
  texto: string,
): Promise<VarianteEncontrada[]> {
  await exigirSesion();
  const supabase = await crearClienteServidor();

  const busqueda = texto.trim();
  if (busqueda.length < 2) return [];

  const { data } = await supabase
    .from("product_variants")
    .select("id, sku, barcode, size, color, sale_price, stock, products!inner(id, name, images, is_active)")
    .eq("is_active", true)
    .eq("products.is_active", true)
    .ilike("products.name", `%${busqueda}%`)
    .order("size")
    .limit(24);

  return (data ?? []).map((v) => {
    const producto = v.products as unknown as {
      id: string;
      name: string;
      images: string[];
    };
    return {
      variant_id: v.id,
      product_id: producto.id,
      product_name: producto.name,
      sku: v.sku ?? "",
      barcode: v.barcode ?? "",
      size: v.size,
      color: v.color,
      sale_price: v.sale_price,
      stock: v.stock,
      images: producto.images ?? [],
    };
  });
}

export type LineaVenta = {
  variant_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
};

export type PagoVenta = {
  method: MetodoPago;
  amount: number;
  reference?: string;
  received?: number;
  change_due?: number;
};

export type ResultadoVenta =
  | { ok: true; ventaId: string; numero: string }
  | { ok: false; error: string };

/**
 * Registra la venta.
 *
 * Toda la lógica pesada vive en `create_pos_sale`: bloquea las
 * variantes, valida el stock, descuenta, escribe el kardex y los pagos,
 * todo en una transacción. Si algo falla no queda media venta. Aquí solo
 * se traduce el error a algo que un cajero pueda entender de pie y con
 * fila.
 */
export async function registrarVenta(
  lineas: LineaVenta[],
  pagos: PagoVenta[],
  descuento: number,
  notas: string | null,
): Promise<ResultadoVenta> {
  await exigirSesion();
  const supabase = await crearClienteServidor();

  if (lineas.length === 0) return { ok: false, error: "La venta no tiene productos." };
  if (pagos.length === 0) return { ok: false, error: "Falta registrar el pago." };

  const { data, error } = await supabase.rpc("create_pos_sale", {
    p_items: lineas,
    p_payments: pagos,
    p_discount: descuento,
    p_notes: notas ?? undefined,
  });

  if (error) {
    const mensaje = error.message;
    if (mensaje.includes("No hay caja abierta")) {
      return { ok: false, error: "No hay turno abierto. Ábrelo antes de vender." };
    }
    if (mensaje.includes("Stock insuficiente")) {
      // El mensaje de la base ya dice qué prenda y cuánto queda.
      return { ok: false, error: mensaje.replace(/^.*Stock insuficiente/, "Stock insuficiente") };
    }
    if (mensaje.includes("por encima del precio")) {
      return { ok: false, error: "No puedes vender por encima del precio de lista." };
    }
    if (mensaje.includes("no cubre el total")) {
      return { ok: false, error: "El pago no cubre el total de la venta." };
    }
    return { ok: false, error: mensaje };
  }

  const venta = data as unknown as { id: string; number: string };

  revalidatePath("/ventas");
  revalidatePath("/caja");
  revalidatePath("/productos");

  return { ok: true, ventaId: venta.id, numero: venta.number };
}
