"use client";

import Link from "next/link";

import { LogoMonaco } from "@/components/ui/LogoMonaco";
import { unidadesCarritoWeb, usarCarrito } from "@/store/carrito";
import { useEffect, useState } from "react";

export function CabeceraTienda({
  categorias,
}: {
  categorias: { slug: string; name: string }[];
}) {
  const lineas = usarCarrito((e) => e.lineas);
  const [montado, setMontado] = useState(false);

  // El carrito vive en localStorage, que en el servidor no existe. Sin
  // esperar al montaje, el número que pinta el servidor y el que pinta
  // el navegador no coinciden y React protesta por hidratación.
  useEffect(() => setMontado(true), []);

  const unidades = montado ? unidadesCarritoWeb(lineas) : 0;

  return (
    <header className="sticky top-0 z-10 border-b border-humo bg-negro/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <Link href="/" aria-label="Inicio" className="shrink-0">
          <LogoMonaco alto={56} prioridad />
        </Link>

        <nav aria-label="Categorías" className="flex flex-wrap items-center gap-1">
          <Link
            href="/catalogo"
            className="px-3 py-2 text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:text-blanco"
          >
            Todo
          </Link>
          {categorias.map((c) => (
            <Link
              key={c.slug}
              href={`/catalogo?categoria=${c.slug}`}
              className="px-3 py-2 text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:text-blanco"
            >
              {c.name}
            </Link>
          ))}

          <Link
            href="/carrito"
            className="ml-2 flex items-center gap-2 border border-humo px-4 py-2 text-xs tracking-[0.16em] text-blanco uppercase transition-colors hover:border-gris"
          >
            Carrito
            {unidades > 0 ? (
              <span className="bg-rojo px-2 py-0.5 font-mono text-[11px] text-blanco">
                {unidades}
              </span>
            ) : null}
          </Link>
        </nav>
      </div>
    </header>
  );
}
