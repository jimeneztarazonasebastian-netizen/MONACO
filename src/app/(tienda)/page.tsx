import Link from "next/link";

import {
  TarjetaPrenda,
  type PrendaCatalogo,
} from "@/components/tienda/TarjetaPrenda";
import { LogoMonaco } from "@/components/ui/LogoMonaco";
import { crearClienteServidor } from "@/lib/supabase/server";

const SELECCION =
  "id, name, slug, images, price_from, price_to, price_varies, total_stock, sizes, colors";

/**
 * Razones para comprar aquí y no en otro lado.
 *
 * Van sobre el pliegue a propósito: el cliente llega desde Instagram sin
 * conocer la tienda y lo primero que se pregunta es si le van a
 * responder y si puede cambiar la prenda si no le queda.
 */
const PROMESAS = [
  {
    titulo: "Se cierra por WhatsApp",
    detalle: "Sin pagos en línea. Acordamos entrega y pago por chat.",
  },
  {
    titulo: "Cambios en 8 días",
    detalle: "Si no te queda la talla, la cambiamos con la tirilla.",
  },
  {
    titulo: "Stock real",
    detalle: "Lo que ves disponible está en la tienda, no encargado.",
  },
];

export default async function PaginaInicio() {
  const supabase = await crearClienteServidor();

  const [{ data: destacadas }, { data: nuevas }, { data: categorias }, { data: tienda }] =
    await Promise.all([
      supabase.from("v_catalog").select(SELECCION).eq("is_featured", true).limit(4),
      supabase.from("v_catalog").select(SELECCION).limit(8),
      supabase
        .from("categories")
        .select("slug, name")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("position")
        .order("name"),
      supabase.from("store_settings").select("slogan, address, schedule").maybeSingle(),
    ]);

  const hayDestacadas = destacadas && destacadas.length > 0;
  const vitrina = hayDestacadas ? destacadas : (nuevas ?? []);

  return (
    <>
      {/* --- Portada --- */}
      <section className="relative overflow-hidden border-b border-humo">
        {/* El corte a 35°, el mismo del monograma, como fondo. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(125deg, var(--color-blanco) 0 1px, transparent 1px 26px)",
          }}
        />

        <div className="relative mx-auto max-w-4xl px-5 py-20 text-center sm:py-28">
          {/* El logo ya trae la palabra MÓNACO con su propia tipografía.
              El h1 va oculto a la vista para que los buscadores y los
              lectores de pantalla tengan el título, sin repetir el
              nombre en otra letra al lado de la marca. */}
          <h1 className="sr-only">Mónaco, tienda de ropa deportiva</h1>

          <div className="mb-8 flex justify-center">
            <LogoMonaco alto={260} prioridad className="h-auto w-52 sm:w-64" />
          </div>

          {tienda?.slogan ? (
            <p className="fuente-display mb-8 text-sm text-rojo sm:text-base">
              {tienda.slogan}
            </p>
          ) : null}

          <p className="mx-auto mb-12 max-w-lg text-lg leading-relaxed text-gris">
            Ropa deportiva para entrenar de verdad. Tallas reales, precios
            claros y una tienda física en Barrancabermeja donde puedes
            probártela.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/catalogo"
              className="bisel-sm inline-flex h-14 items-center bg-rojo px-10 text-xs font-semibold tracking-[0.2em] text-blanco uppercase transition-opacity hover:opacity-90"
            >
              Ver el catálogo
            </Link>

            {categorias?.map((c) => (
              <Link
                key={c.slug}
                href={`/catalogo?categoria=${c.slug}`}
                className="bisel-sm inline-flex h-14 items-center border border-humo px-6 text-xs tracking-[0.2em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --- Promesas --- */}
      <section className="border-b border-humo">
        <ul className="mx-auto grid max-w-6xl gap-px bg-humo sm:grid-cols-3">
          {PROMESAS.map((p) => (
            <li key={p.titulo} className="bg-negro px-6 py-8">
              <p className="mb-2 text-xs tracking-[0.16em] text-rojo uppercase">
                {p.titulo}
              </p>
              <p className="text-sm leading-relaxed text-gris">{p.detalle}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* --- Vitrina --- */}
      {vitrina.length > 0 ? (
        <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="fuente-display text-lg">
              {hayDestacadas ? "Destacados" : "Lo que hay"}
            </h2>
            <Link
              href="/catalogo"
              className="text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:text-blanco"
            >
              Ver todo →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {vitrina.map((p) => (
              <TarjetaPrenda key={p.id} prenda={p as PrendaCatalogo} />
            ))}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-lg px-5 py-24 text-center">
          <p className="mb-3 text-blanco">Todavía no hay prendas publicadas.</p>
          <p className="text-sm text-gris">
            Estamos cargando el catálogo. Vuelve pronto.
          </p>
        </section>
      )}

      {/* --- Cierre --- */}
      <section className="border-t border-humo px-5 py-16 text-center">
        <h2 className="fuente-display mb-4 text-lg">Pasa por la tienda</h2>
        <p className="mx-auto mb-8 max-w-md leading-relaxed text-gris">
          {tienda?.address ?? "Barrancabermeja"}
          {tienda?.schedule ? <>. {tienda.schedule}</> : null}
        </p>
        <Link
          href="/catalogo"
          className="bisel-sm inline-flex h-14 items-center border border-humo px-10 text-xs tracking-[0.2em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
        >
          Empezar a mirar
        </Link>
      </section>
    </>
  );
}
