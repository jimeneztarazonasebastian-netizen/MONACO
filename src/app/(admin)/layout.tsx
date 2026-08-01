import { NavAdmin } from "@/components/admin/NavAdmin";
import { Logotipo } from "@/components/ui/Logotipo";
import { cerrarSesion } from "@/lib/actions/auth";
import { exigirSesion } from "@/lib/sesion";

/**
 * Nada de administración se prerenderiza. Estas pantallas dependen de
 * quién esté logueado, así que una versión cacheada en el build sería
 * la de nadie, o peor, la del último que entró.
 */
export const dynamic = "force-dynamic";

/**
 * Cascarón de administración. El middleware ya bloqueó el paso sin
 * sesión; esta comprobación es la segunda cerradura, la que vale, por
 * si mañana alguien toca el matcher del middleware.
 */
export default async function LayoutAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await exigirSesion();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-humo bg-carbon">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3">
          <Logotipo />

          <div className="flex items-center gap-4">
            <span className="text-right text-xs leading-tight">
              <span className="block text-blanco">
                {perfil.full_name ?? "Sin nombre"}
              </span>
              <span className="block tracking-[0.16em] text-gris uppercase">
                {perfil.role === "admin" ? "Dueño" : "Cajero"}
              </span>
            </span>

            <form action={cerrarSesion}>
              <button
                type="submit"
                className="border border-humo px-4 py-2 text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
              >
                Salir
              </button>
            </form>
          </div>
        </div>

        <div className="px-2 pb-1">
          <NavAdmin rol={perfil.role} />
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
