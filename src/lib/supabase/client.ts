import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * Cliente para componentes de navegador. Solo lectura y suscripciones
 * Realtime: toda escritura pasa por una Server Action (regla 2 del
 * CLAUDE.md).
 */
export function crearClienteNavegador() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
