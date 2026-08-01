import Link from "next/link";

import {
  TarjetaPrenda,
  type PrendaCatalogo,
} from "@/components/tienda/TarjetaPrenda";
import { Monograma } from "@/components/ui/Logotipo";
import { crearClienteServidor } from "@/lib/supabase/server";

export default async function PaginaInicio() {
  const supabase = await crearClienteServidor();

  const [{ data: destacadas }, { data: tienda }] = await Promise.all([
    supabase
      .from("v_catalog")
      .select("id, name, slug, images, price_from, price_varies, total_stock, sizes")
      .eq("is_featured", true)
      .limit(8),
    supabase.from("store_settings").select("slogan, address").maybeSingle(),
  ]);

  return (
    <>
      <section className="border-b border-humo px-5 py-24 text-center sm:py-32">
        <Monograma className="mx-auto mb-8 h-16 w-16 text-blanco" />
        <h1 className="fuente-display mb-4 text-3xl sm:text-5xl">Mónaco</h1>
        {tienda?.slogan ? (
          <p className="fuente-display mb-6 text-sm text-rojo">{tienda.slogan}</p>
        ) : null}
        <p className="mx-auto mb-10 max-w-md leading-relaxed text-gris">
          Ropa deportiva. Barrancabermeja.
        </p>
        <Link
          href="/catalogo"
          className="bisel-sm inline-flex h-14 items-center bg-rojo px-10 text-xs font-semibold tracking-[0.2em] text-blanco uppercase transition-opacity hover:opacity-90"
        >
          Ver el catálogo
        </Link>
      </section>

      {destacadas && destacadas.length > 0 ? (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="fuente-display mb-8 text-lg">Destacados</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {destacadas.map((p) => (
              <TarjetaPrenda key={p.id} prenda={p as PrendaCatalogo} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
