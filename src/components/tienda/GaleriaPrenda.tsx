"use client";

import Image from "next/image";
import { useState } from "react";

import { Monograma } from "@/components/ui/Logotipo";
import { urlImagen } from "@/lib/imagenes";

/**
 * Galería de la ficha.
 *
 * Las miniaturas eran decorativas: se veían pero no hacían nada. En una
 * tienda de ropa la segunda foto suele ser la de la espalda o el detalle
 * del tejido, y es justo la que decide la compra.
 */
export function GaleriaPrenda({
  fotos,
  nombre,
}: {
  fotos: string[];
  nombre: string;
}) {
  const [activa, setActiva] = useState(0);
  const principal = urlImagen(fotos[activa]);

  return (
    <div className="flex flex-col gap-3">
      <div className="bisel relative aspect-4/5 overflow-hidden border border-humo">
        {principal ? (
          <Image
            src={principal}
            alt={nombre}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <span className="sin-foto flex h-full flex-col items-center justify-center gap-4">
            <Monograma className="h-12 w-12 text-humo" />
            <span className="text-xs tracking-[0.16em] text-gris uppercase">
              Foto en camino
            </span>
          </span>
        )}
      </div>

      {fotos.length > 1 ? (
        <div className="grid grid-cols-4 gap-3">
          {fotos.slice(0, 8).map((ruta, i) => (
            <button
              key={ruta}
              type="button"
              onClick={() => setActiva(i)}
              aria-label={`Ver la foto ${i + 1} de ${nombre}`}
              aria-current={i === activa}
              className={`relative aspect-square overflow-hidden border transition-colors ${
                i === activa
                  ? "border-blanco"
                  : "border-humo hover:border-gris"
              }`}
            >
              <Image
                src={urlImagen(ruta)!}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
