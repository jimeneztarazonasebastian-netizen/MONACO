import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GaleriaPrenda } from "@/components/tienda/GaleriaPrenda";
import {
  SelectorPrenda,
  type VariantePublica,
} from "@/components/tienda/SelectorPrenda";
import {
  TarjetaPrenda,
  type PrendaCatalogo,
} from "@/components/tienda/TarjetaPrenda";
import { primeraImagen } from "@/lib/imagenes";
import { crearClienteServidor } from "@/lib/supabase/server";

async function cargar(slug: string) {
  const supabase = await crearClienteServidor();

  const { data: producto } = await supabase
    .from("products")
    .select("id, name, slug, description, images, category_id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!producto) return null;

  const { data: variantes } = await supabase
    .from("product_variants")
    .select("id, size, color, sale_price, stock")
    .eq("product_id", producto.id)
    .eq("is_active", true)
    .order("color")
    .order("size");

  return { producto, variantes: (variantes ?? []) as VariantePublica[] };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const datos = await cargar(slug);
  if (!datos) return { title: "Prenda no encontrada" };

  const foto = primeraImagen(datos.producto.images);

  return {
    title: datos.producto.name,
    description:
      datos.producto.description ??
      `${datos.producto.name} — ropa deportiva Mónaco, Barrancabermeja.`,
    openGraph: {
      title: `${datos.producto.name} · Mónaco`,
      description: datos.producto.description ?? undefined,
      images: foto ? [foto] : [],
      type: "website",
    },
  };
}

export default async function PaginaPrenda({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const datos = await cargar(slug);
  if (!datos) notFound();

  const { producto, variantes } = datos;
  const fotos = producto.images ?? [];

  // Otras prendas de la misma categoría: en una tienda pequeña, lo que
  // evita que el cliente se vaya después de mirar una sola cosa.
  const supabase = await crearClienteServidor();
  const { data: relacionadas } = producto.category_id
    ? await supabase
        .from("v_catalog")
        .select(
          "id, name, slug, images, price_from, price_to, price_varies, total_stock, sizes, colors",
        )
        .eq("category_id", producto.category_id)
        .neq("id", producto.id)
        .limit(4)
    : { data: null };

  return (
    <>
      <article className="mx-auto max-w-6xl px-5 py-10">
        <Link
          href="/catalogo"
          className="mb-8 inline-block text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:text-blanco"
        >
          ← Catálogo
        </Link>

        <div className="grid gap-10 lg:grid-cols-2">
          <GaleriaPrenda fotos={fotos} nombre={producto.name} />

          <div className="flex flex-col gap-8">
            <div>
              <h1 className="fuente-display mb-4 text-2xl sm:text-3xl">
                {producto.name}
              </h1>
              {producto.description ? (
                <p className="leading-relaxed text-gris">{producto.description}</p>
              ) : null}
            </div>

            {variantes.length > 0 ? (
              <SelectorPrenda
                slug={producto.slug}
                nombre={producto.name}
                imagen={fotos[0] ?? null}
                variantes={variantes}
              />
            ) : (
              <p className="text-gris">Esta prenda no está disponible por ahora.</p>
            )}

            <ul className="flex flex-col gap-3 border-t border-humo pt-6 text-sm text-gris">
              <li className="flex gap-3">
                <span className="text-rojo">·</span>
                Cambios dentro de los 8 días presentando la tirilla.
              </li>
              <li className="flex gap-3">
                <span className="text-rojo">·</span>
                Puedes venir a la tienda a medírtela antes de llevarla.
              </li>
              <li className="flex gap-3">
                <span className="text-rojo">·</span>
                No se cobra nada en línea: el pago se acuerda por WhatsApp.
              </li>
            </ul>
          </div>
        </div>
      </article>

      {relacionadas && relacionadas.length > 0 ? (
        <section className="mx-auto max-w-6xl border-t border-humo px-5 py-14">
          <h2 className="fuente-display mb-8 text-lg">También te puede servir</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {relacionadas.map((p) => (
              <TarjetaPrenda key={p.id} prenda={p as PrendaCatalogo} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
