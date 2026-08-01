import type { Database } from "@/types/database";

/**
 * Atajos a las funciones de reporte.
 *
 * Los tipos salen del esquema generado, así que si mañana cambia una
 * columna del reporte, esto deja de compilar en vez de fallar en
 * pantalla.
 */
type Funciones = Database["public"]["Functions"];

export type Resumen = Funciones["reporte_resumen"]["Returns"][number];
export type PorDia = Funciones["reporte_por_dia"]["Returns"][number];
export type PorMetodo = Funciones["reporte_por_metodo"]["Returns"][number];
export type TopPrenda = Funciones["reporte_top_prendas"]["Returns"][number];
