"use client";

import Image from "next/image";
import { useActionState } from "react";

import { Aviso, BotonEnviar, Etiqueta } from "@/components/ui/campos";
import { ESTADO_INICIAL } from "@/lib/actions/estado";
import { eliminarImagen, subirImagenes } from "@/lib/actions/productos";
import { urlImagen } from "@/lib/imagenes";

export function GestorImagenes({
  productoId,
  imagenes,
}: {
  productoId: string;
  imagenes: string[];
}) {
  const [estado, accion] = useActionState(subirImagenes, ESTADO_INICIAL);

  return (
    <div className="flex flex-col gap-5">
      {imagenes.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {imagenes.map((ruta, i) => (
            <li key={ruta} className="relative">
              <div className="bisel-sm relative aspect-square overflow-hidden border border-humo bg-negro">
                <Image
                  src={urlImagen(ruta)!}
                  alt={`Foto ${i + 1}`}
                  fill
                  sizes="150px"
                  className="object-cover"
                />
              </div>
              {i === 0 ? (
                <span className="absolute top-1 left-1 bg-negro/80 px-1.5 py-0.5 text-[10px] tracking-[0.14em] text-gris uppercase">
                  Portada
                </span>
              ) : null}
              <form action={eliminarImagen.bind(null, productoId, ruta)}>
                <button
                  type="submit"
                  aria-label={`Quitar la foto ${i + 1}`}
                  className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center bg-negro/80 text-gris transition-colors hover:text-rojo"
                >
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gris">
          Sin fotos todavía. La primera que subas queda como portada en el
          catálogo.
        </p>
      )}

      <form action={accion} className="flex flex-col gap-3">
        <input type="hidden" name="producto_id" value={productoId} />

        <label className="flex flex-col gap-2">
          <Etiqueta>Agregar fotos</Etiqueta>
          <input
            type="file"
            name="imagenes"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            required
            className="w-full border border-humo bg-carbon p-3 text-sm text-gris file:mr-3 file:border-0 file:bg-humo file:px-4 file:py-2 file:text-xs file:tracking-[0.14em] file:text-blanco file:uppercase"
          />
        </label>

        <p className="text-xs text-gris">
          JPG, PNG, WebP o AVIF. Máximo 5 MB por foto.
        </p>

        <Aviso>{estado.error}</Aviso>

        <div>
          <BotonEnviar variante="secundario">Subir</BotonEnviar>
        </div>
      </form>
    </div>
  );
}
