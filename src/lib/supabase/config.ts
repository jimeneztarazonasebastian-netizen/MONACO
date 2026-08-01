/**
 * Lectura única de las variables de entorno de Supabase.
 *
 * Mientras no exista la base (local o en la nube) las variables van
 * vacías. En vez de reventar con un error críptico, la app detecta que
 * no hay configuración y lo dice de frente en la pantalla de login.
 * Las rutas protegidas siguen cerradas: sin configuración no hay sesión,
 * y sin sesión no se entra.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigurado =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
