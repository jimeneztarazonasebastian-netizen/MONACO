import Link from "next/link";

import { CabeceraTienda } from "@/components/tienda/CabeceraTienda";
import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";

export default async function LayoutTienda({
  children,
}: {
  children: React.ReactNode;
}) {
  let categorias: { slug: string; name: string }[] = [];
  let tienda: { whatsapp: string | null; address: string | null; schedule: string | null } | null =
    null;

  if (supabaseConfigurado) {
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
    categorias = cats ?? [];
    tienda = ajustes;
  }

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
