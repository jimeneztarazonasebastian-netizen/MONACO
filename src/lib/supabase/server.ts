import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * Cliente para Server Components, Server Actions y Route Handlers.
 * Se crea uno nuevo por petición: nunca guardarlo en una variable de
 * módulo, porque las cookies de sesión cambian entre usuarios.
 */
export async function crearClienteServidor() {
  const almacenCookies = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return almacenCookies.getAll();
      },
      setAll(cookiesNuevas) {
        try {
          cookiesNuevas.forEach(({ name, value, options }) => {
            almacenCookies.set(name, value, options);
          });
        } catch {
          // Un Server Component no puede escribir cookies. No es un
          // problema: el middleware ya refrescó la sesión antes de
          // llegar aquí.
        }
      },
    },
  });
}
