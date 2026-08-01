import { SUPABASE_URL } from "@/lib/supabase/config";

export const BUCKET_PRODUCTOS = "productos";

/**
 * En `products.images` se guarda la ruta dentro del bucket, no la URL
 * completa. Si mañana cambia el proyecto de Supabase o se pone un CDN
 * delante, se cambia esta función y no cada fila de la base.
 */
export function urlImagen(ruta: string | null | undefined): string | null {
  if (!ruta) return null;
  if (ruta.startsWith("http")) return ruta; // por si alguna quedó absoluta
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_PRODUCTOS}/${ruta}`;
}

export function primeraImagen(imagenes: string[] | null | undefined): string | null {
  return urlImagen(imagenes?.[0]);
}
