"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { supabaseConfigurado } from "@/lib/supabase/config";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * `correo` vuelve al formulario porque React 19 lo reinicia cuando la
 * acción termina: sin esto, quien se equivoca de contraseña tiene que
 * volver a escribir también el correo.
 */
export type EstadoLogin = { error: string | null; correo?: string };

/** Rutas a las que se permite volver tras iniciar sesión. */
function destinoSeguro(valor: FormDataEntryValue | null): string {
  const destino = typeof valor === "string" ? valor : "";
  // Solo rutas internas: evita que un enlace manipulado mande al
  // usuario a otro dominio después de autenticarse.
  return destino.startsWith("/") && !destino.startsWith("//") ? destino : "/pos";
}

export async function iniciarSesion(
  _estadoPrevio: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  if (!supabaseConfigurado) {
    return {
      error:
        "Falta configurar la conexión a la base de datos. Revisa .env.local.",
    };
  }

  const correo = String(formData.get("correo") ?? "").trim();
  const clave = String(formData.get("clave") ?? "");
  const destino = destinoSeguro(formData.get("redirigir"));

  if (!correo || !clave) {
    return { error: "Escribe tu correo y tu contraseña.", correo };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: clave,
  });

  if (error) {
    // Mensaje genérico a propósito: decir "ese correo no existe"
    // le regala al atacante la mitad del trabajo.
    return { error: "Correo o contraseña incorrectos.", correo };
  }

  revalidatePath("/", "layout");
  redirect(destino);
}

export async function cerrarSesion() {
  if (supabaseConfigurado) {
    const supabase = await crearClienteServidor();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
