import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Llamadas a las funciones de reporte de la migración 0007.
 *
 * `src/types/database.ts` se genera contra el esquema y todavía no las
 * conoce; regenerarlo es la tarea pendiente. Mientras tanto, el rodeo de
 * tipos vive aquí y en ningún otro sitio: el resto de la aplicación
 * consume estas funciones ya tipadas, y cuando los tipos se regeneren
 * este archivo sigue funcionando igual.
 */

export type Resumen = {
  ventas: number;
  unidades: number;
  ingresos: number;
  descuentos: number;
  costo: number;
  margen: number;
  ticket_promedio: number;
};

export type PorDia = {
  dia: string;
  ventas: number;
  ingresos: number;
  costo: number;
  margen: number;
};

export type PorMetodo = { metodo: string; cobros: number; total: number };

export type TopPrenda = {
  producto: string;
  talla: string;
  color: string;
  unidades: number;
  ingresos: number;
  margen: number;
};

type Rango = { p_desde: string; p_hasta: string };

type ClienteConReportes = {
  rpc: (
    nombre: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function comoCliente(supabase: SupabaseClient<any, any, any>): ClienteConReportes {
  return supabase as unknown as ClienteConReportes;
}

async function llamar<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  nombre: string,
  args: Record<string, unknown>,
): Promise<{ filas: T[]; error: string | null }> {
  const { data, error } = await comoCliente(supabase).rpc(nombre, args);
  if (error) return { filas: [], error: error.message };
  return { filas: (data ?? []) as T[], error: null };
}

export function resumen(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  rango: Rango,
) {
  return llamar<Resumen>(supabase, "reporte_resumen", rango);
}

export function porDia(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  rango: Rango,
) {
  return llamar<PorDia>(supabase, "reporte_por_dia", rango);
}

export function porMetodo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  rango: Rango,
) {
  return llamar<PorMetodo>(supabase, "reporte_por_metodo", rango);
}

export function topPrendas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  rango: Rango,
  limite = 15,
) {
  return llamar<TopPrenda>(supabase, "reporte_top_prendas", {
    ...rango,
    p_limite: limite,
  });
}
