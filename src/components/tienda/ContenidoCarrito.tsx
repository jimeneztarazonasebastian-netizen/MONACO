"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { pesos } from "@/lib/formato";
import { urlImagen } from "@/lib/imagenes";
import { totalCarrito, unidadesCarritoWeb, usarCarrito } from "@/store/carrito";
import { plural } from "@/lib/texto";

export function ContenidoCarrito() {
  const { lineas, cambiarCantidad, quitar, vaciar } = usarCarrito();
  const [montado, setMontado] = useState(false);

  // El carrito vive en localStorage: hasta que el navegador no monta el
  // componente no hay nada que mostrar, y pintar el vacío antes provoca
  // un parpadeo feo en cada visita.
  useEffect(() => setMontado(true), []);

  if (!montado) {
    return <section className="mx-auto max-w-3xl px-5 py-16" aria-busy="true" />;
  }

  const total = totalCarrito(lineas);
  const unidades = unidadesCarritoWeb(lineas);

  if (lineas.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h1 className="fuente-display mb-5 text-2xl">Tu carrito está vacío</h1>
        <p className="mb-10 text-gris">Todavía no has agregado ninguna prenda.</p>
        <Link
          href="/catalogo"
          className="bisel-sm inline-flex h-14 items-center border border-humo px-10 text-xs tracking-[0.2em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
        >
          Ver el catálogo
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="fuente-display mb-2 text-2xl">Tu carrito</h1>
      <p className="mb-10 font-mono text-xs text-gris">
        {plural(unidades, "prenda", "prendas")}
      </p>

      <ul className="flex flex-col">
        {lineas.map((l) => {
          const foto = urlImagen(l.imagen);
          return (
            <li
              key={l.variantId}
              className="flex flex-wrap items-center gap-4 border-b border-humo py-5"
            >
              <div className="relative h-24 w-20 shrink-0 overflow-hidden border border-humo bg-carbon">
                {foto ? (
                  <Image src={foto} alt="" fill sizes="80px" className="object-cover" />
                ) : null}
              </div>

              <div className="min-w-40 flex-1">
                <Link
                  href={`/catalogo/${l.slug}`}
                  className="block text-sm text-blanco transition-colors hover:text-gris"
                >
                  {l.productName}
                </Link>
                <p className="font-mono text-xs text-gris">
                  {l.size} · {l.color}
                </p>
                <p className="mt-1 font-mono text-sm text-blanco">
                  {pesos(l.precio)}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => cambiarCantidad(l.variantId, l.cantidad - 1)}
                  aria-label={`Quitar una unidad de ${l.productName}`}
                  className="h-11 w-11 border border-humo text-lg text-blanco transition-colors hover:border-gris"
                >
                  −
                </button>
                <span className="w-10 text-center font-mono text-base text-blanco">
                  {l.cantidad}
                </span>
                <button
                  type="button"
                  onClick={() => cambiarCantidad(l.variantId, l.cantidad + 1)}
                  disabled={l.cantidad >= l.stock}
                  aria-label={`Agregar una unidad de ${l.productName}`}
                  className="h-11 w-11 border border-humo text-lg text-blanco transition-colors hover:border-gris disabled:opacity-30"
                >
                  +
                </button>
              </div>

              <span className="w-28 text-right font-mono text-sm text-blanco">
                {pesos(l.precio * l.cantidad)}
              </span>

              <button
                type="button"
                onClick={() => quitar(l.variantId)}
                aria-label={`Quitar ${l.productName} del carrito`}
                className="px-2 text-gris transition-colors hover:text-rojo"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex items-baseline justify-between border-t border-humo pt-6">
        <span className="text-sm tracking-[0.16em] text-gris uppercase">Total</span>
        <span className="fuente-display text-3xl">{pesos(total)}</span>
      </div>

      <div className="mt-10 flex flex-col gap-4">
        <button
          type="button"
          disabled
          className="bisel-sm h-16 bg-rojo px-8 text-sm font-semibold tracking-[0.2em] text-blanco uppercase disabled:opacity-40"
        >
          Terminar por WhatsApp
        </button>
        <p className="text-xs leading-relaxed text-gris">
          El cierre por WhatsApp todavía no está construido: va en el siguiente
          paso. Cuando lo esté, este botón abrirá el chat de la tienda con tu
          pedido ya redactado y un número de referencia.
        </p>

        <button
          type="button"
          onClick={vaciar}
          className="self-start text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:text-rojo"
        >
          Vaciar el carrito
        </button>
      </div>
    </section>
  );
}
