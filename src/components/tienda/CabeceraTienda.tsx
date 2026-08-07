"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { LogoMonaco } from "@/components/ui/LogoMonaco";
import { unidadesCarritoWeb, usarCarrito } from "@/store/carrito";

export function CabeceraTienda({
  categorias,
}: {
  categorias: { slug: string; name: string }[];
}) {
  const lineas = usarCarrito((e) => e.lineas);
  const [montado, setMontado] = useState(false);
  const [bajado, setBajado] = useState(false);

  // El carrito vive en localStorage, que en el servidor no existe. Sin
  // esperar al montaje, el número que pinta el servidor y el que pinta
  // el navegador no coinciden y React protesta por hidratación.
  useEffect(() => setMontado(true), []);

  // La cabecera arranca transparente para que la foto de la portada se
  // vea entera, y se opaca en cuanto el visitante baja. Con el fondo
  // sólido desde el principio, la portada empezaba cortada por una banda
  // negra y perdía todo el efecto.
  useEffect(() => {
    const alBajar = () => setBajado(window.scrollY > 24);
    alBajar();
    window.addEventListener("scroll", alBajar, { passive: true });
    return () => window.removeEventListener("scroll", alBajar);
  }, []);

  // La cabecera es `fixed`, así que no ocupa sitio: el hueco lo reserva
  // el `main` del layout con `--alto-cabecera`. Ese valor estaba escrito
  // a mano y se desajustó dos veces —una en cada dirección— porque la
  // barra mide distinto arriba del todo que encogida por el scroll, y
  // distinto en móvil que en escritorio. Aquí se mide sola.
  //
  // El CSS conserva un valor de partida para que antes de que corra esto,
  // y sin JavaScript, el hueco ya sea aproximadamente correcto.
  const referencia = useRef<HTMLElement>(null);
  useEffect(() => {
    const nodo = referencia.current;
    if (!nodo || typeof ResizeObserver === "undefined") return;

    const medir = () => {
      // Sin encoger: es el estado que tiene arriba del todo, que es
      // justo cuando el hueco de abajo importa.
      if (window.scrollY > 24) return;
      document.documentElement.style.setProperty(
        "--alto-cabecera",
        `${nodo.getBoundingClientRect().height}px`,
      );
    };

    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  const unidades = montado ? unidadesCarritoWeb(lineas) : 0;

  const enlaceCategoria =
    "shrink-0 px-3 py-2 text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:text-blanco";

  return (
    <header
      ref={referencia}
      className={`fixed top-0 right-0 left-0 z-20 transition-colors duration-300 ${
        bajado
          ? "border-b border-humo bg-negro/95 backdrop-blur"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl px-5">
        <div
          className={`flex items-center justify-between gap-4 transition-all duration-300 ${
            bajado ? "py-3" : "py-4 sm:py-5"
          }`}
        >
          <Link href="/" aria-label="Inicio" className="shrink-0">
            <LogoMonaco
              alto={56}
              prioridad
              className={`h-auto transition-all duration-300 ${bajado ? "w-12" : "w-14 sm:w-16"}`}
            />
          </Link>

          {/* En pantalla ancha las categorías caben en la misma línea. En
              el teléfono no: envolvían en tres renglones y la cabecera fija
              se comía 190 px, un cuarto de la pantalla. Ahí bajan a su
              propia fila y se desplazan de lado. */}
          <nav
            aria-label="Categorías"
            className="hidden items-center gap-1 sm:flex"
          >
            <Link href="/catalogo" className={enlaceCategoria}>
              Todo
            </Link>
            {categorias.map((c) => (
              <Link
                key={c.slug}
                href={`/catalogo?categoria=${c.slug}`}
                className={enlaceCategoria}
              >
                {c.name}
              </Link>
            ))}
          </nav>

          <Link
            href="/carrito"
            className="flex shrink-0 items-center gap-2 border border-humo bg-negro/40 px-4 py-2 text-xs tracking-[0.16em] text-blanco uppercase backdrop-blur transition-colors hover:border-gris"
          >
            Carrito
            {unidades > 0 ? (
              <span className="bg-rojo px-2 py-0.5 font-mono text-[11px] text-blanco">
                {unidades}
              </span>
            ) : null}
          </Link>
        </div>

        <nav
          aria-label="Categorías"
          className="-mx-5 flex gap-1 overflow-x-auto px-5 pb-2 sm:hidden [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          <Link href="/catalogo" className={enlaceCategoria}>
            Todo
          </Link>
          {categorias.map((c) => (
            <Link
              key={c.slug}
              href={`/catalogo?categoria=${c.slug}`}
              className={enlaceCategoria}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
