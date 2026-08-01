import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import type { Perfil } from "@/types/database";

/**
 * Sesión del lado del servidor. Devuelve el usuario de auth junto con
 * su perfil, que es donde vive el rol.
 *
 * Siempre `getUser()`, nunca `getSession()`: el segundo lee la cookie
 * sin validarla contra el servidor y se puede falsificar.
 */
export async function obtenerSesion(): Promise<{ perfil: Perfil } | null> {
  if (!supabaseConfigurado) return null;

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!perfil) return null;

  return { perfil };
}

/** Para páginas de administración: sin sesión, al login. */
export async function exigirSesion(): Promise<Perfil> {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  return sesion.perfil;
}

/**
 * Para lo que solo puede tocar el dueño: precios, productos,
 * inventario y configuración. El cajero que llegue aquí por URL directa
 * se devuelve al POS, que es su pantalla.
 */
export async function exigirAdmin(): Promise<Perfil> {
  const perfil = await exigirSesion();
  if (perfil.role !== "admin") redirect("/pos");
  return perfil;
}

export function esAdmin(perfil: Perfil | null | undefined): boolean {
  return perfil?.role === "admin";
}
