"use server";

import { revalidatePath } from "next/cache";

import type { EstadoFormulario } from "@/lib/actions/estado";
import { BUCKET_PRODUCTOS } from "@/lib/imagenes";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { aEntero, aPesos, aSlug, aTexto, listaSeparadaPorComas } from "@/lib/texto";
import type { TipoMovimiento } from "@/types/database";

/** Una variante tal como llega del formulario, antes de tocar la base. */
type VarianteEntrada = {
  size: string;
  color: string;
  cost_price: number;
  sale_price: number;
  stock: number;
  barcode: string | null;
};

function leerVariantes(formData: FormData): VarianteEntrada[] {
  const crudo = aTexto(formData.get("variantes"));
  if (!crudo) return [];

  let datos: unknown;
  try {
    datos = JSON.parse(crudo);
  } catch {
    return [];
  }
  if (!Array.isArray(datos)) return [];

  return datos
    .map((v) => {
      const fila = v as Record<string, unknown>;
      return {
        size: String(fila.size ?? "").trim(),
        color: String(fila.color ?? "").trim(),
        cost_price: Number(fila.cost_price) || 0,
        sale_price: Number(fila.sale_price) || 0,
        stock: Number(fila.stock) || 0,
        barcode: String(fila.barcode ?? "").trim() || null,
      };
    })
    .filter((v) => v.size && v.color);
}

function validarVariantes(variantes: VarianteEntrada[]): string | null {
  if (variantes.length === 0) {
    return "Agrega al menos una variante: el stock vive en la talla y el color, no en el producto.";
  }

  const combinaciones = new Set<string>();
  for (const v of variantes) {
    const clave = `${v.size.toLowerCase()}|${v.color.toLowerCase()}`;
    if (combinaciones.has(clave)) {
      return `La combinación ${v.size} / ${v.color} está repetida.`;
    }
    combinaciones.add(clave);

    if (v.sale_price <= 0) {
      return `Falta el precio de venta de ${v.size} / ${v.color}.`;
    }
    if (v.sale_price < v.cost_price) {
      return `${v.size} / ${v.color} se vendería por debajo del costo.`;
    }
    if (v.stock < 0) {
      return `El stock de ${v.size} / ${v.color} no puede ser negativo.`;
    }
  }

  return null;
}

/**
 * Crea las variantes con stock en cero y mete la existencia inicial por
 * `adjust_stock`.
 *
 * Podría insertarse el stock directo en la fila, pero entonces el kardex
 * arrancaría mintiendo: habría prendas en bodega sin un solo movimiento
 * que explique de dónde salieron. Así la historia del inventario está
 * completa desde la primera prenda.
 */
async function insertarVariantes(
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>,
  productoId: string,
  variantes: VarianteEntrada[],
): Promise<string | null> {
  const { data: creadas, error } = await supabase
    .from("product_variants")
    .insert(
      variantes.map((v) => ({
        product_id: productoId,
        size: v.size,
        color: v.color,
        cost_price: v.cost_price,
        sale_price: v.sale_price,
        stock: 0,
        barcode: v.barcode,
      })),
    )
    .select("id, size, color");

  if (error) {
    if (error.code === "23505") {
      return "Ese código de barras ya está en uso por otra prenda.";
    }
    return `No se pudieron crear las variantes: ${error.message}`;
  }

  for (const creada of creadas ?? []) {
    const entrada = variantes.find(
      (v) => v.size === creada.size && v.color === creada.color,
    );
    if (!entrada || entrada.stock <= 0) continue;

    const { error: errorStock } = await supabase.rpc("adjust_stock", {
      p_variant_id: creada.id,
      p_quantity: entrada.stock,
      p_type: "entrada" as TipoMovimiento,
      p_note: "Existencia inicial",
    });

    if (errorStock) {
      return `La prenda quedó creada, pero el stock inicial de ${creada.size} / ${creada.color} falló: ${errorStock.message}`;
    }
  }

  return null;
}

// =====================================================================
// Productos
// =====================================================================

export async function crearProducto(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const nombre = aTexto(formData.get("nombre"));
  if (!nombre) return { error: "El producto necesita un nombre." };

  const variantes = leerVariantes(formData);
  const problema = validarVariantes(variantes);
  if (problema) return { error: problema };

  const categoriaId = aTexto(formData.get("categoria")) || null;

  const { data: producto, error } = await supabase
    .from("products")
    .insert({
      name: nombre,
      slug: aSlug(nombre),
      description: aTexto(formData.get("descripcion")) || null,
      category_id: categoriaId,
      is_featured: formData.get("destacado") === "on",
      base_price: Math.min(...variantes.map((v) => v.sale_price)),
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un producto con ese nombre." };
    }
    return { error: `No se pudo crear el producto: ${error.message}` };
  }

  const fallo = await insertarVariantes(supabase, producto.id, variantes);
  if (fallo) return { error: fallo, id: producto.id };

  revalidatePath("/productos");
  return { error: null, ok: true, id: producto.id };
}

export async function actualizarProducto(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const id = aTexto(formData.get("id"));
  const nombre = aTexto(formData.get("nombre"));
  if (!id) return { error: "Falta el producto." };
  if (!nombre) return { error: "El producto necesita un nombre." };

  const { error } = await supabase
    .from("products")
    .update({
      name: nombre,
      slug: aSlug(nombre),
      description: aTexto(formData.get("descripcion")) || null,
      category_id: aTexto(formData.get("categoria")) || null,
      is_featured: formData.get("destacado") === "on",
    })
    .eq("id", id);

  if (error) {
    // Renombrar hacia un nombre ya usado choca contra el slug único.
    if (error.code === "23505") {
      return { error: "Ya existe otra prenda con ese nombre." };
    }
    return { error: `No se pudo guardar: ${error.message}` };
  }

  revalidatePath("/productos");
  revalidatePath(`/productos/${id}`);
  return { error: null, ok: true, id };
}

/**
 * No se borra: se archiva. Un producto borrado se llevaría por delante
 * el histórico de ventas que lo referencia.
 */
export async function cambiarEstadoProducto(id: string, activo: boolean) {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  await supabase.from("products").update({ is_active: activo }).eq("id", id);

  revalidatePath("/productos");
  revalidatePath(`/productos/${id}`);
}

// =====================================================================
// Variantes
// =====================================================================

export async function agregarVariantes(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const productoId = aTexto(formData.get("producto_id"));
  if (!productoId) return { error: "Falta el producto." };

  const variantes = leerVariantes(formData);
  const problema = validarVariantes(variantes);
  if (problema) return { error: problema };

  const fallo = await insertarVariantes(supabase, productoId, variantes);
  if (fallo) return { error: fallo };

  revalidatePath(`/productos/${productoId}`);
  return { error: null, ok: true };
}

/**
 * Edita una variante. `stock` no está aquí a propósito: se mueve solo
 * por `adjust_stock`, para que todo cambio quede en el kardex.
 */
export async function actualizarVariante(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const id = aTexto(formData.get("id"));
  const productoId = aTexto(formData.get("producto_id"));
  if (!id) return { error: "Falta la variante." };

  const costo = aPesos(formData.get("costo"));
  const precio = aPesos(formData.get("precio"));

  if (precio <= 0) return { error: "El precio de venta no puede quedar en cero." };
  if (precio < costo) return { error: "El precio quedaría por debajo del costo." };

  const { error } = await supabase
    .from("product_variants")
    .update({
      size: aTexto(formData.get("talla")),
      color: aTexto(formData.get("color")),
      cost_price: costo,
      sale_price: precio,
      low_stock_threshold: aEntero(formData.get("aviso_stock")),
    })
    .eq("id", id);

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath(`/productos/${productoId}`);
  revalidatePath("/inventario");
  return { error: null, ok: true };
}

export async function cambiarEstadoVariante(
  id: string,
  productoId: string,
  activa: boolean,
) {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  await supabase.from("product_variants").update({ is_active: activa }).eq("id", id);

  revalidatePath(`/productos/${productoId}`);
}

export async function ajustarStock(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const varianteId = aTexto(formData.get("variante_id"));
  const productoId = aTexto(formData.get("producto_id"));
  const cantidad = aEntero(formData.get("cantidad"));
  const tipo = aTexto(formData.get("tipo")) as TipoMovimiento;
  const nota = aTexto(formData.get("nota"));

  if (!varianteId) return { error: "Falta la variante." };
  if (cantidad === 0) return { error: "La cantidad no puede ser cero." };
  if (!nota) return { error: "Escribe de dónde sale o a dónde va la mercancía." };

  const { error } = await supabase.rpc("adjust_stock", {
    p_variant_id: varianteId,
    p_quantity: cantidad,
    p_type: tipo,
    p_note: nota,
  });

  if (error) {
    // El check `stock >= 0` de la base salta si se intenta sacar más de
    // lo que hay.
    if (error.message.includes("stock")) {
      return { error: "No puedes sacar más unidades de las que hay en bodega." };
    }
    return { error: `No se pudo ajustar: ${error.message}` };
  }

  revalidatePath(`/productos/${productoId}`);
  revalidatePath("/inventario");
  return { error: null, ok: true };
}

// =====================================================================
// Precios en bloque
// =====================================================================

export async function fijarPrecioUnico(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const productoId = aTexto(formData.get("producto_id"));
  const precio = aPesos(formData.get("precio"));
  if (precio <= 0) return { error: "Escribe un precio." };

  const { error } = await supabase.rpc("set_product_price", {
    p_product_id: productoId,
    p_price: precio,
  });

  if (error) return { error: `No se pudo cambiar el precio: ${error.message}` };

  revalidatePath(`/productos/${productoId}`);
  revalidatePath("/productos");
  return { error: null, ok: true };
}

export async function fijarPrecioPorTalla(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const productoId = aTexto(formData.get("producto_id"));
  const precios: Record<string, number> = {};

  for (const [clave, valor] of formData.entries()) {
    if (!clave.startsWith("precio_talla_")) continue;
    const talla = clave.slice("precio_talla_".length);
    const monto = aPesos(valor);
    if (monto > 0) precios[talla] = monto;
  }

  if (Object.keys(precios).length === 0) {
    return { error: "No escribiste ningún precio." };
  }

  const { error } = await supabase.rpc("set_price_by_size", {
    p_product_id: productoId,
    p_prices: precios,
  });

  if (error) return { error: `No se pudieron cambiar los precios: ${error.message}` };

  revalidatePath(`/productos/${productoId}`);
  revalidatePath("/productos");
  return { error: null, ok: true };
}

// =====================================================================
// Imágenes
// =====================================================================

export async function subirImagenes(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const productoId = aTexto(formData.get("producto_id"));
  const archivos = formData
    .getAll("imagenes")
    .filter((a): a is File => a instanceof File && a.size > 0);

  if (archivos.length === 0) return { error: "No elegiste ninguna foto." };

  const { data: producto } = await supabase
    .from("products")
    .select("images")
    .eq("id", productoId)
    .single();

  const rutas = [...(producto?.images ?? [])];

  for (const archivo of archivos) {
    const extension = (archivo.name.split(".").pop() ?? "jpg").toLowerCase();
    const ruta = `${productoId}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from(BUCKET_PRODUCTOS)
      .upload(ruta, archivo, { contentType: archivo.type, upsert: false });

    if (error) {
      return { error: `No se pudo subir ${archivo.name}: ${error.message}` };
    }
    rutas.push(ruta);
  }

  const { error } = await supabase
    .from("products")
    .update({ images: rutas })
    .eq("id", productoId);

  if (error) return { error: `Las fotos subieron pero no se guardaron: ${error.message}` };

  revalidatePath(`/productos/${productoId}`);
  revalidatePath("/productos");
  return { error: null, ok: true };
}

export async function eliminarImagen(productoId: string, ruta: string) {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const { data: producto } = await supabase
    .from("products")
    .select("images")
    .eq("id", productoId)
    .single();

  const restantes = (producto?.images ?? []).filter((r) => r !== ruta);

  await supabase.from("products").update({ images: restantes }).eq("id", productoId);
  await supabase.storage.from(BUCKET_PRODUCTOS).remove([ruta]);

  revalidatePath(`/productos/${productoId}`);
  revalidatePath("/productos");
}

// =====================================================================
// Categorías
// =====================================================================

export async function crearCategoria(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const nombres = listaSeparadaPorComas(aTexto(formData.get("nombre")));
  if (nombres.length === 0) return { error: "Escribe el nombre de la categoría." };

  const { error } = await supabase.from("categories").insert(
    nombres.map((nombre) => ({
      name: nombre,
      slug: aSlug(nombre),
      parent_id: aTexto(formData.get("padre")) || null,
    })),
  );

  if (error) {
    if (error.code === "23505") return { error: "Esa categoría ya existe." };
    return { error: `No se pudo crear: ${error.message}` };
  }

  revalidatePath("/productos/categorias");
  revalidatePath("/productos");
  return { error: null, ok: true };
}

export async function cambiarEstadoCategoria(id: string, activa: boolean) {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  await supabase.from("categories").update({ is_active: activa }).eq("id", id);

  revalidatePath("/productos/categorias");
}
