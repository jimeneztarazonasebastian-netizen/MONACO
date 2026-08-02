import Link from "next/link";

import { CabeceraTienda } from "@/components/tienda/CabeceraTienda";
import { Monograma } from "@/components/ui/Logotipo";
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
      <Monograma className="mb-8 h-14 w-14 text-humo" />
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
      <CabeceraTienda categorias={categorias} />

      <main className="flex-1">{children}</main>

      <footer className="mt-20 border-t border-humo px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-8 text-xs text-gris">
          <div>
            <p className="fuente-display mb-3 text-blanco">Mónaco</p>
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
