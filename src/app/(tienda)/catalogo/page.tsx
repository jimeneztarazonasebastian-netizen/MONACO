import type { Metadata } from "next";
import Link from "next/link";

import {
  TarjetaPrenda,
  type PrendaCatalogo,
} from "@/components/tienda/TarjetaPrenda";
import { crearClienteServidor } from "@/lib/supabase/server";
import { ordenarTallas, plural } from "@/lib/texto";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Ropa deportiva Mónaco. Bucaramanga, Colombia.",
};

const ORDENES = [
  { clave: "nuevo", etiqueta: "Lo más nuevo" },
  { clave: "barato", etiqueta: "Menor precio" },
  { clave: "caro", etiqueta: "Mayor precio" },
] as const;

export default async function PaginaCatalogo({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; talla?: string; orden?: string }>;
}) {
  const { categoria, talla, orden } = await searchParams;
  const supabase = await crearClienteServidor();

  const { data: categorias } = await supabase
    .from("categories")
    .select("id, slug, name")
    .eq("is_active", true)
    .order("name");

  const categoriaElegida = categorias?.find((c) => c.slug === categoria);

  let consulta = supabase
    .from("v_catalog")
    .select(
      "id, name, slug, images, price_from, price_varies, total_stock, sizes, category_id",
    );

  if (categoriaElegida) consulta = consulta.eq("category_id", categoriaElegida.id);
  if (talla) consulta = consulta.contains("sizes", [talla]);

  if (orden === "barato") consulta = consulta.order("price_from");
  else if (orden === "caro") consulta = consulta.order("price_from", { ascending: false });
  else consulta = consulta.order("name");

  const { data: prendas } = await consulta;

  // Las tallas del filtro salen de lo que hay en el catálogo, no de una
  // lista quemada: si mañana entran tallas infantiles, aparecen solas.
  const tallas = ordenarTallas([
    ...new Set((prendas ?? []).flatMap((p) => p.sizes ?? [])),
  ]);

  const enlace = (cambios: Record<string, string | undefined>) => {
    const parametros = new URLSearchParams();
    const combinado = { categoria, talla, orden, ...cambios };
    for (const [clave, valor] of Object.entries(combinado)) {
      if (valor) parametros.set(clave, valor);
    }
    const cadena = parametros.toString();
    return cadena ? `/catalogo?${cadena}` : "/catalogo";
  };

  return (
    <section className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="fuente-display mb-8 text-2xl">
        {categoriaElegida ? categoriaElegida.name : "Catálogo"}
      </h1>

      <div className="mb-10 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs tracking-[0.16em] text-gris uppercase">
            Categoría
          </span>
          <Link
            href={enlace({ categoria: undefined })}
            className={`px-3 py-2 text-xs tracking-[0.14em] uppercase transition-colors ${
              !categoria ? "bg-humo text-blanco" : "text-gris hover:text-blanco"
            }`}
          >
            Todas
          </Link>
          {categorias?.map((c) => (
            <Link
              key={c.id}
              href={enlace({ categoria: c.slug })}
              className={`px-3 py-2 text-xs tracking-[0.14em] uppercase transition-colors ${
                categoria === c.slug
                  ? "bg-humo text-blanco"
                  : "text-gris hover:text-blanco"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        {tallas.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-xs tracking-[0.16em] text-gris uppercase">
              Talla
            </span>
            <Link
              href={enlace({ talla: undefined })}
              className={`px-3 py-2 font-mono text-xs uppercase transition-colors ${
                !talla ? "bg-humo text-blanco" : "text-gris hover:text-blanco"
              }`}
            >
              Todas
            </Link>
            {tallas.map((t) => (
              <Link
                key={t}
                href={enlace({ talla: t })}
                className={`px-3 py-2 font-mono text-xs uppercase transition-colors ${
                  talla === t ? "bg-humo text-blanco" : "text-gris hover:text-blanco"
                }`}
              >
                {t}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs tracking-[0.16em] text-gris uppercase">
            Orden
          </span>
          {ORDENES.map((o) => (
            <Link
              key={o.clave}
              href={enlace({ orden: o.clave })}
              className={`px-3 py-2 text-xs tracking-[0.14em] uppercase transition-colors ${
                (orden ?? "nuevo") === o.clave
                  ? "bg-humo text-blanco"
                  : "text-gris hover:text-blanco"
              }`}
            >
              {o.etiqueta}
            </Link>
          ))}
        </div>
      </div>

      {prendas && prendas.length > 0 ? (
        <>
          <p className="mb-6 font-mono text-xs text-gris">
            {plural(prendas.length, "prenda", "prendas")}
          </p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {prendas.map((p) => (
              <TarjetaPrenda key={p.id} prenda={p as PrendaCatalogo} />
            ))}
          </div>
        </>
      ) : (
        <p className="py-16 text-center text-gris">
          No hay prendas que coincidan con esos filtros.
        </p>
      )}
    </section>
  );
}
