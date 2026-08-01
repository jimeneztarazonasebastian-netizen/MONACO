import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  SelectorPrenda,
  type VariantePublica,
} from "@/components/tienda/SelectorPrenda";
import { primeraImagen, urlImagen } from "@/lib/imagenes";
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

  return {
    title: datos.producto.name,
    description:
      datos.producto.description ??
      `${datos.producto.name} — ropa deportiva Mónaco, Bucaramanga.`,
    openGraph: {
      title: datos.producto.name,
      images: primeraImagen(datos.producto.images)
        ? [primeraImagen(datos.producto.images)!]
        : [],
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

  return (
    <article className="mx-auto max-w-6xl px-5 py-10">
      <Link
        href="/catalogo"
        className="mb-8 inline-block text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:text-blanco"
      >
        ← Catálogo
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="bisel relative aspect-4/5 overflow-hidden border border-humo bg-carbon">
            {fotos[0] ? (
              <Image
                src={urlImagen(fotos[0])!}
                alt={producto.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-xs tracking-[0.16em] text-gris uppercase">
                Sin foto
              </span>
            )}
          </div>

          {fotos.length > 1 ? (
            <div className="grid grid-cols-4 gap-3">
              {fotos.slice(1, 5).map((ruta) => (
                <div
                  key={ruta}
                  className="relative aspect-square overflow-hidden border border-humo bg-carbon"
                >
                  <Image
                    src={urlImagen(ruta)!}
                    alt=""
                    fill
                    sizes="150px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

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
        </div>
      </div>
    </article>
  );
}
