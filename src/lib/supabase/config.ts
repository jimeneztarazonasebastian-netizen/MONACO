/**
 * Lectura única de las variables de entorno de Supabase.
 *
 * Mientras no exista la base (local o en la nube) las variables van
 * vacías. En vez de reventar con un error críptico, la app detecta que
 * no hay configuración y lo dice de frente en la pantalla de login.
 * Las rutas protegidas siguen cerradas: sin configuración no hay sesión,
 * y sin sesión no se entra.
 */
/**
 * Se recortan los espacios a propósito. Al pegar los valores en el panel
 * de Vercel es fácil que se cuele un espacio al principio o al final, y
 * el fallo que provoca no se parece en nada a la causa: `new URL()`
 * recorta espacios por especificación, así que el cliente de Supabase
 * sigue funcionando y la tienda carga datos con normalidad. Lo único que
 * se rompe es la concatenación de `urlImagen()`, que arrastra el espacio
 * hasta el optimizador de `next/image` y este rechaza la URL. Resultado:
 * todas las fotos aparecen rotas y la base parece estar bien.
 */
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
export const SUPABASE_ANON_KEY = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
).trim();

export const supabaseConfigurado =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
