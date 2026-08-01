"use client";

import { useMemo, useState } from "react";

import { pesos } from "@/lib/formato";
import { compararTallas } from "@/lib/texto";
import { usarCarrito } from "@/store/carrito";

export type VariantePublica = {
  id: string;
  size: string;
  color: string;
  sale_price: number;
  stock: number;
};

export function SelectorPrenda({
  slug,
  nombre,
  imagen,
  variantes,
}: {
  slug: string;
  nombre: string;
  imagen: string | null;
  variantes: VariantePublica[];
}) {
  const colores = useMemo(
    () => [...new Set(variantes.map((v) => v.color))],
    [variantes],
  );

  const [color, setColor] = useState(colores[0] ?? "");
  const [tallaId, setTallaId] = useState<string | null>(null);
  const [agregada, setAgregada] = useState(false);

  const agregar = usarCarrito((e) => e.agregar);

  const delColor = variantes
    .filter((v) => v.color === color)
    .sort((a, b) => compararTallas(a.size, b.size));
  const elegida = delColor.find((v) => v.id === tallaId) ?? null;

  function meterAlCarrito() {
    if (!elegida) return;
    agregar({
      variantId: elegida.id,
      slug,
      productName: nombre,
      size: elegida.size,
      color: elegida.color,
      precio: elegida.sale_price,
      imagen,
      stock: elegida.stock,
    });
    setAgregada(true);
    setTimeout(() => setAgregada(false), 2500);
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="fuente-display text-2xl">
        {elegida
          ? pesos(elegida.sale_price)
          : delColor.length > 0
            ? `${Math.min(...delColor.map((v) => v.sale_price)) !== Math.max(...delColor.map((v) => v.sale_price)) ? "desde " : ""}${pesos(Math.min(...delColor.map((v) => v.sale_price)))}`
            : ""}
      </p>

      {colores.length > 1 ? (
        <div>
          <p className="mb-3 text-xs tracking-[0.16em] text-gris uppercase">
            Color
          </p>
          <div className="flex flex-wrap gap-2">
            {colores.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  setTallaId(null);
                }}
                className={`border px-5 py-3 text-sm transition-colors ${
                  color === c
                    ? "border-blanco text-blanco"
                    : "border-humo text-gris hover:border-gris hover:text-blanco"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-3 text-xs tracking-[0.16em] text-gris uppercase">Talla</p>
        <div className="flex flex-wrap gap-2">
          {delColor.map((v) => {
            const agotada = v.stock <= 0;
            const activa = tallaId === v.id;
            return (
              <button
                key={v.id}
                type="button"
                disabled={agotada}
                onClick={() => setTallaId(v.id)}
                aria-label={`Talla ${v.size}${agotada ? ", agotada" : ""}`}
                className={`badge-diagonal min-w-16 px-5 py-3 transition-colors ${
                  activa
                    ? "bg-blanco text-negro"
                    : agotada
                      ? "border border-humo text-humo line-through"
                      : "border border-humo text-blanco hover:border-gris"
                }`}
              >
                <span className="badge-diagonal-texto font-mono text-sm">
                  {v.size}
                </span>
              </button>
            );
          })}
        </div>

        {elegida && elegida.stock <= 3 ? (
          <p className="mt-3 font-mono text-xs text-rojo">
            Quedan {elegida.stock}
          </p>
        ) : null}
      </div>

      <div>
        <button
          type="button"
          onClick={meterAlCarrito}
          disabled={!elegida}
          className="bisel-sm h-16 w-full bg-rojo px-8 text-sm font-semibold tracking-[0.2em] text-blanco uppercase transition-opacity hover:opacity-90 disabled:opacity-30 sm:w-auto"
        >
          {agregada ? "Agregado ✓" : elegida ? "Agregar al carrito" : "Elige tu talla"}
        </button>

        <p className="mt-4 text-xs leading-relaxed text-gris">
          El pedido se termina por WhatsApp. Al confirmar el carrito te abrimos
          el chat con el resumen ya escrito.
        </p>
      </div>
    </div>
  );
}
