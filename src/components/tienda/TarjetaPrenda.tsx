import Image from "next/image";
import Link from "next/link";

import { pesos } from "@/lib/formato";
import { primeraImagen } from "@/lib/imagenes";
import { ordenarTallas } from "@/lib/texto";

export type PrendaCatalogo = {
  id: string | null;
  name: string | null;
  slug: string | null;
  images: string[] | null;
  price_from: number | null;
  price_varies: boolean | null;
  total_stock: number | null;
  sizes: string[] | null;
};

export function TarjetaPrenda({ prenda }: { prenda: PrendaCatalogo }) {
  const foto = primeraImagen(prenda.images);
  const agotada = (prenda.total_stock ?? 0) <= 0;

  return (
    <Link
      href={`/catalogo/${prenda.slug}`}
      className="group bisel block border border-humo bg-carbon transition-colors hover:border-gris"
    >
      <div className="relative aspect-4/5 overflow-hidden bg-negro">
        {foto ? (
          <Image
            src={foto}
            alt={prenda.name ?? ""}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-xs tracking-[0.16em] text-gris uppercase">
            Sin foto
          </span>
        )}

        {agotada ? (
          <span className="absolute top-3 left-3 bg-rojo px-2 py-1 text-[10px] tracking-[0.16em] text-blanco uppercase">
            Agotado
          </span>
        ) : null}
      </div>

      <div className="p-4">
        <h3 className="mb-1 truncate text-sm text-blanco">{prenda.name}</h3>
        <p className="font-mono text-sm text-blanco">
          {prenda.price_varies ? "desde " : ""}
          {pesos(prenda.price_from)}
        </p>
        {prenda.sizes && prenda.sizes.length > 0 ? (
          <p className="mt-2 font-mono text-xs text-gris">
            {ordenarTallas(prenda.sizes).join(" · ")}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
