import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from "./config";

/** Prefijos que exigen sesión iniciada. */
const RUTAS_PRIVADAS = [
  "/pos",
  "/productos",
  "/inventario",
  "/ventas",
  "/pedidos",
  "/caja",
  "/reportes",
  "/configuracion",
];

export function esRutaPrivada(pathname: string) {
  return RUTAS_PRIVADAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );
}

/**
 * Refresca el token de sesión en cada petición y cierra el paso a las
 * rutas de administración.
 *
 * Ojo con el orden: hay que llamar a `getUser()` inmediatamente después
 * de crear el cliente. Si se mete lógica en medio, el token puede
 * quedar sin refrescar y al usuario lo sacan de la sesión sin motivo.
 */
export async function actualizarSesion(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  // Sin configuración no hay sesión posible: se falla cerrando la
  // puerta, nunca abriéndola.
  if (!supabaseConfigurado) {
    if (esRutaPrivada(request.nextUrl.pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirigir", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    return respuesta;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesNuevas) {
        cookiesNuevas.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        respuesta = NextResponse.next({ request });
        cookiesNuevas.forEach(({ name, value, options }) => {
          respuesta.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && esRutaPrivada(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirigir", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Si ya tiene sesión, el login no tiene nada que ofrecerle.
  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/pos";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return respuesta;
}
