import Image from "next/image";
import Link from "next/link";

import { Monograma } from "@/components/ui/Logotipo";
import { pesos } from "@/lib/formato";
import { primeraImagen } from "@/lib/imagenes";
import { ordenarTallas } from "@/lib/texto";

export type PrendaCatalogo = {
  id: string | null;
  name: string | null;
  slug: string | null;
  images: string[] | null;
  price_from: number | null;
  price_to: number | null;
  price_varies: boolean | null;
  total_stock: number | null;
  sizes: string[] | null;
  colors: string[] | null;
};

export function TarjetaPrenda({ prenda }: { prenda: PrendaCatalogo }) {
  const foto = primeraImagen(prenda.images);
  const stock = prenda.total_stock ?? 0;
  const agotada = stock <= 0;
  const ultimas = !agotada && stock <= 3;
  const tallas = ordenarTallas(prenda.sizes ?? []);
  const colores = prenda.colors ?? [];

  return (
    <Link
      href={`/catalogo/${prenda.slug}`}
      className="bisel group block h-full border border-humo bg-carbon transition-colors hover:border-gris focus-visible:border-gris"
    >
      <div className="barrido group-hover:barrido-activo relative aspect-4/5 overflow-hidden">
        {foto ? (
          <Image
            src={foto}
            alt={prenda.name ?? ""}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="sin-foto flex h-full items-center justify-center">
            <Monograma className="h-10 w-10 text-humo" />
          </span>
        )}

        {agotada ? (
          <span className="absolute top-0 left-0 bg-negro/85 px-3 py-2 text-[10px] tracking-[0.18em] text-gris uppercase">
            Agotado
          </span>
        ) : ultimas ? (
          <span className="absolute top-0 left-0 bg-rojo px-3 py-2 text-[10px] font-semibold tracking-[0.18em] text-blanco uppercase">
            Últimas {stock}
          </span>
        ) : null}

        {/* Las tallas aparecen sobre la foto al pasar el mouse: el
            cliente descarta de un vistazo lo que no tiene su talla. */}
        {tallas.length > 0 && !agotada ? (
          <span className="absolute right-0 bottom-0 left-0 flex flex-wrap justify-center gap-1 bg-gradient-to-t from-negro/90 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {tallas.map((t) => (
              <span
                key={t}
                className="border border-gris/60 px-2 py-0.5 font-mono text-[10px] text-blanco"
              >
                {t}
              </span>
            ))}
          </span>
        ) : null}
      </div>

      <div className="p-4">
        <h3 className="mb-2 truncate text-sm text-blanco">{prenda.name}</h3>

        <p className="font-mono text-base text-blanco">
          {prenda.price_varies ? (
            <span className="text-xs tracking-[0.1em] text-gris uppercase">
              desde{" "}
            </span>
          ) : null}
          {pesos(prenda.price_from)}
        </p>

        {colores.length > 0 ? (
          <p className="mt-2 truncate text-xs text-gris">
            {colores.length === 1
              ? colores[0]
              : `${colores.length} colores`}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
