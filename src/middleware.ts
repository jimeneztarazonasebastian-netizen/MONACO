import type { NextRequest } from "next/server";

import { actualizarSesion } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return actualizarSesion(request);
}

export const config = {
  matcher: [
    /*
     * Todo menos archivos estáticos e imágenes. El catálogo público
     * también pasa por aquí para que la sesión se refresque si el dueño
     * navega la tienda con su cuenta abierta.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
