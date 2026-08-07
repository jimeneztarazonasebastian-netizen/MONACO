import Image from "next/image";
import Link from "next/link";

import {
  TarjetaPrenda,
  type PrendaCatalogo,
} from "@/components/tienda/TarjetaPrenda";
import { LogoMonaco } from "@/components/ui/LogoMonaco";
import { primeraImagen } from "@/lib/imagenes";
import { plural } from "@/lib/texto";
import { crearClienteServidor } from "@/lib/supabase/server";

const SELECCION =
  "id, name, slug, images, category_id, price_from, price_to, price_varies, total_stock, sizes, colors";

/**
 * Razones para comprar aquí y no en otro lado.
 *
 * Van arriba a propósito: el cliente llega desde Instagram sin conocer la
 * tienda y lo primero que se pregunta es si le van a responder y si puede
 * cambiar la prenda si no le queda.
 */
const PROMESAS = [
  {
    titulo: "Se cierra por WhatsApp",
    detalle:
      "Sin pagos en línea ni datos de tarjeta. Armas el pedido, nos escribes y acordamos entrega y pago por chat.",
  },
  {
    titulo: "Cambios en 8 días",
    detalle:
      "Si no te queda la talla la cambiamos, presentando la tirilla. En ropa deportiva la talla se falla y no pasa nada.",
  },
  {
    titulo: "Stock real",
    detalle:
      "Lo que ves disponible está en la tienda, contado uno por uno. No mostramos lo que hay que encargar.",
  },
];

/** Lo que corre en la cinta entre la portada y el resto. */
const CINTA = [
  "Tallas reales",
  "Cambios en 8 días",
  "Stock contado uno por uno",
  "Barrancabermeja",
  "Se cierra por WhatsApp",
  "Tienda física",
];

export default async function PaginaInicio() {
  const supabase = await crearClienteServidor();

  const [{ data: destacadas }, { data: catalogo }, { data: categorias }, { data: tienda }] =
    await Promise.all([
      supabase.from("v_catalog").select(SELECCION).eq("is_featured", true).limit(5),
      supabase.from("v_catalog").select(SELECCION).limit(12),
      supabase
        .from("categories")
        .select("id, slug, name")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("position")
        .order("name"),
      supabase
        .from("store_settings")
        .select("slogan, address, schedule, whatsapp")
        .maybeSingle(),
    ]);

  const todas = (catalogo ?? []) as PrendaCatalogo[];
  const hayDestacadas = destacadas && destacadas.length > 0;
  const vitrina = (hayDestacadas ? destacadas : todas.slice(0, 5)) as PrendaCatalogo[];

  // La portada se apoya en una prenda real: una foto de ropa vende más
  // que cualquier fondo abstracto. Se prefiere una destacada, y si no hay
  // nada publicado la sección cae a la trama sola, sin romperse.
  const prendaPortada = vitrina[0] ?? todas[0] ?? null;
  const fotoPortada = primeraImagen(prendaPortada?.images);

  // La prenda de la portada no vuelve a salir de cabeza en la vitrina:
  // verla dos veces en la misma pantalla hace pensar que el catálogo es
  // de una sola prenda. Sólo se aparta si queda vitrina de sobra.
  const escaparate =
    vitrina.length > 3 && prendaPortada
      ? vitrina.filter((p) => p.id !== prendaPortada.id)
      : vitrina;

  // Cada categoría enseña la foto de una de sus prendas. Sin esto los
  // nombres son tres palabras sueltas y no invitan a entrar.
  const fotoDeCategoria = new Map<string, string>();
  for (const p of todas) {
    const cat = (p as PrendaCatalogo & { category_id: string | null }).category_id;
    const foto = primeraImagen(p.images);
    if (cat && foto && !fotoDeCategoria.has(cat)) fotoDeCategoria.set(cat, foto);
  }

  const titular = tienda?.slogan?.trim() || "Ropa para entrenar de verdad";

  return (
    <>
      {/* ---------------------------------------------------------------
          Portada.
          Ocupa casi toda la ventana y se apoya abajo a la izquierda, no
          en el centro: el ojo entra por la foto y aterriza en el titular.
          El h1 va oculto porque el logo ya trae la palabra MÓNACO con su
          propia tipografía; repetirla al lado serían dos marcas juntas.
          --------------------------------------------------------------- */}
      <section
        className="relative isolate flex min-h-[88svh] flex-col justify-end overflow-hidden"
        // Recupera el hueco que el layout reserva para la cabecera fija:
        // la foto tiene que arrancar en el borde de la ventana.
        style={{ marginTop: "calc(-1 * var(--alto-cabecera))" }}
      >
        {fotoPortada ? (
          <Image
            src={fotoPortada}
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[68%_center]"
          />
        ) : null}

        <div aria-hidden="true" className="velo-foto absolute inset-0" />
        <div
          aria-hidden="true"
          className="trama-35 pointer-events-none absolute inset-0"
          style={{ "--trama": 0.09 } as React.CSSProperties}
        />

        <div className="relative mx-auto w-full max-w-6xl px-5 pt-32 pb-14 sm:pb-20">
          <h1 className="sr-only">Mónaco, tienda de ropa deportiva</h1>

          <LogoMonaco
            alto={220}
            prioridad
            className="mb-8 h-auto w-40 sm:w-52"
          />

          <p className="titulo-gigante max-w-3xl text-blanco">{titular}</p>

          <p className="mt-7 max-w-md text-base leading-relaxed text-gris sm:text-lg">
            Tallas reales, precios claros y una tienda física en
            Barrancabermeja donde puedes probártela antes de llevártela.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/catalogo"
              className="bisel-sm inline-flex h-14 items-center bg-rojo px-10 text-xs font-semibold tracking-[0.2em] text-blanco uppercase transition-opacity hover:opacity-90"
            >
              Ver el catálogo
            </Link>

            {tienda?.whatsapp ? (
              <Link
                href="/catalogo"
                className="bisel-sm inline-flex h-14 items-center border border-humo bg-negro/40 px-8 text-xs tracking-[0.2em] text-gris uppercase backdrop-blur transition-colors hover:border-gris hover:text-blanco"
              >
                Cómo comprar
              </Link>
            ) : null}
          </div>

          {/* Fila de datos: hace que la tienda se sienta habitada y no
              una plantilla recién instalada. */}
          <p className="mt-10 font-mono text-[11px] tracking-[0.14em] text-gris uppercase">
            {todas.length > 0 ? (
              <>{plural(todas.length, "prenda publicada", "prendas publicadas")} · </>
            ) : null}
            {categorias && categorias.length > 0 ? (
              <>{plural(categorias.length, "categoría", "categorías")} · </>
            ) : null}
            Barrancabermeja
          </p>

          <div
            aria-hidden="true"
            className="senal-scroll mt-12 hidden sm:block"
          >
            <span />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------
          Cinta. Un solo renglón en movimiento entre dos bloques quietos.
          --------------------------------------------------------------- */}
      <section
        aria-hidden="true"
        className="overflow-hidden border-y border-humo bg-carbon py-3"
      >
        <div className="marquesina">
          {/* Duplicado a propósito: la animación corre hasta -50% y al
              llegar la cinta está idéntica al inicio, así que el ciclo no
              tiene costura visible. */}
          {[0, 1].map((copia) => (
            <div key={copia} className="marquesina-grupo">
              {CINTA.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-6 px-6 font-mono text-[11px] tracking-[0.18em] text-gris uppercase"
                >
                  {t}
                  <span className="block h-3 w-px skew-x-[-35deg] bg-rojo" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------
          Promesas. Numeradas y alineadas a la izquierda: se leen como una
          lista de condiciones, no como tres tarjetas decorativas.
          --------------------------------------------------------------- */}
      <section className="corte-diagonal mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <ol className="grid gap-px bg-humo sm:grid-cols-3">
          {PROMESAS.map((p, i) => (
            <li
              key={p.titulo}
              style={{ "--i": i } as React.CSSProperties}
              className="revelar bg-negro px-6 py-8 sm:px-8 sm:py-10"
            >
              <span className="mb-5 block font-mono text-xs text-rojo">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="fuente-display-compacta mb-3 text-sm text-blanco">
                {p.titulo}
              </h2>
              <p className="text-sm leading-relaxed text-gris">{p.detalle}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------------------------------------------------------
          Vitrina. La primera prenda ocupa el doble para que la rejilla no
          sea un tablero de piezas iguales.
          --------------------------------------------------------------- */}
      {escaparate.length > 0 ? (
        <section className="mx-auto max-w-6xl px-5 pb-16 sm:pb-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className="titulo-seccion text-blanco">
              {hayDestacadas ? "Destacados" : "Lo que hay"}
            </h2>
            <Link
              href="/catalogo"
              className="enlace-traza text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:text-blanco"
            >
              Ver todo el catálogo
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {escaparate.map((p, i) => (
              <TarjetaPrenda key={p.id} prenda={p} indice={i} grande={i === 0} />
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

      {/* ---------------------------------------------------------------
          Categorías. Renglones tipográficos grandes: al pasar por encima
          la foto de una prenda de esa categoría entra por detrás.
          --------------------------------------------------------------- */}
      {categorias && categorias.length > 0 ? (
        <section className="border-t border-humo">
          <h2 className="sr-only">Categorías</h2>
          <ul>
            {categorias.map((c, i) => {
              const foto = fotoDeCategoria.get(c.id);
              return (
                <li key={c.slug} className="border-b border-humo">
                  <Link
                    href={`/catalogo?categoria=${c.slug}`}
                    style={{ "--i": i } as React.CSSProperties}
                    className="revelar-lado group relative isolate flex items-center justify-between gap-6 overflow-hidden px-5 py-10 sm:py-14"
                  >
                    {foto ? (
                      <>
                        <Image
                          src={foto}
                          alt=""
                          aria-hidden="true"
                          fill
                          sizes="100vw"
                          className="-z-10 object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-25 group-focus-visible:opacity-25"
                        />
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 -z-10 bg-gradient-to-r from-negro via-negro/70 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                        />
                      </>
                    ) : null}

                    <span className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6">
                      <span className="titulo-seccion text-blanco transition-transform duration-500 group-hover:translate-x-2">
                        {c.name}
                      </span>
                      <span className="font-mono text-xs tracking-[0.16em] text-gris uppercase transition-colors group-hover:text-rojo">
                        Ver →
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* ---------------------------------------------------------------
          Cierre. La tienda física es el argumento de venta más fuerte
          frente a comprar por Instagram a un desconocido.
          --------------------------------------------------------------- */}
      <section className="relative overflow-hidden px-5 py-20 sm:py-28">
        <div
          aria-hidden="true"
          className="trama-35 pointer-events-none absolute inset-0"
          style={{ "--trama": 0.05 } as React.CSSProperties}
        />

        <div className="revelar relative mx-auto max-w-3xl">
          <p className="mb-5 font-mono text-xs tracking-[0.2em] text-rojo uppercase">
            Tienda física
          </p>
          <p className="titulo-gigante mb-8 text-blanco">Pasa y pruébatela</p>

          <p className="mb-3 text-lg leading-relaxed text-gris">
            {tienda?.address ?? "Barrancabermeja"}
          </p>
          {tienda?.schedule ? (
            <p className="mb-10 font-mono text-sm text-gris">{tienda.schedule}</p>
          ) : null}

          <Link
            href="/catalogo"
            className="bisel-sm inline-flex h-14 items-center border border-humo px-10 text-xs tracking-[0.2em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
          >
            Empezar a mirar
          </Link>
        </div>
      </section>
    </>
  );
}
