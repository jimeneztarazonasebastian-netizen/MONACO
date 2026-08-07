import Link from "next/link";

import { CabeceraTienda } from "@/components/tienda/CabeceraTienda";
import { CursorMonaco } from "@/components/tienda/CursorMonaco";
import { RevelarAlEntrar } from "@/components/tienda/RevelarAlEntrar";
import { LogoMonaco } from "@/components/ui/LogoMonaco";
import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";

/**
 * Cuando la tienda todavía no tiene base de datos configurada, el
 * catálogo entero se apaga con un aviso en vez de reventar.
 *
 * Sin esto, cada página pública intenta abrir el cliente de Supabase con
 * la URL vacía y el visitante recibe un "Application error" de Next: una
 * pantalla negra que no dice nada y que en un despliegue nuevo es lo
 * primero que se ve.
 */
function TiendaApagada() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LogoMonaco alto={180} className="mb-6 h-auto w-40" />
      <h1 className="fuente-display mb-4 text-2xl">Volvemos pronto</h1>
      <p className="mb-2 max-w-md leading-relaxed text-gris">
        Estamos terminando de montar la tienda en línea.
      </p>
      <p className="text-xs tracking-[0.16em] text-gris uppercase">
        Mónaco · Barrancabermeja
      </p>
    </main>
  );
}

export default async function LayoutTienda({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!supabaseConfigurado) return <TiendaApagada />;

  const supabase = await crearClienteServidor();
  const [{ data: cats }, { data: ajustes }] = await Promise.all([
    supabase
      .from("categories")
      .select("slug, name")
      .eq("is_active", true)
      .is("parent_id", null)
      .order("position")
      .order("name"),
    supabase
      .from("store_settings")
      .select("whatsapp, address, schedule")
      .maybeSingle(),
  ]);

  const categorias = cats ?? [];
  const tienda = ajustes;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* El telón corre una sola vez por carga: este layout no se vuelve
          a montar al navegar entre catálogo, prenda y carrito, así que
          moverse por la tienda no lo repite. */}
      <div className="telon" aria-hidden="true">
        <span className="telon-marca">
          <LogoMonaco alto={200} className="h-auto w-44 sm:w-56" />
          <span className="telon-linea" />
        </span>
      </div>

      <CursorMonaco />
      <RevelarAlEntrar />

      <CabeceraTienda categorias={categorias} />

      <main
        className="entra flex-1"
        style={{ paddingTop: "var(--alto-cabecera)" }}
      >
        {children}
      </main>

      <footer className="mt-20 border-t border-humo px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-8 text-xs text-gris">
          <div>
            <LogoMonaco alto={72} className="mb-3" />
            <p>Ropa deportiva · Barrancabermeja</p>
          </div>

          <div className="flex flex-col gap-1">
            {tienda?.address ? <p>{tienda.address}</p> : null}
            {tienda?.schedule ? <p>{tienda.schedule}</p> : null}
            {tienda?.whatsapp ? <p>WhatsApp {tienda.whatsapp}</p> : null}
          </div>

          <Link
            href="/login"
            className="self-end tracking-[0.16em] uppercase transition-colors hover:text-blanco"
          >
            Entrar
          </Link>
        </div>
      </footer>
    </div>
  );
}
