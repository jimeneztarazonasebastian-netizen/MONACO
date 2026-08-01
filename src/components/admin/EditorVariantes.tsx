"use client";

import { useState } from "react";

import { Campo, Etiqueta } from "@/components/ui/campos";
import { listaSeparadaPorComas } from "@/lib/texto";

export type FilaVariante = {
  size: string;
  color: string;
  cost_price: number;
  sale_price: number;
  stock: number;
  barcode: string;
};

function filaVacia(): FilaVariante {
  return { size: "", color: "", cost_price: 0, sale_price: 0, stock: 0, barcode: "" };
}

const CELDA = "h-11 w-full border border-humo bg-negro px-2 text-sm text-blanco focus:border-gris focus:outline-none";

/**
 * Editor de las variantes de una prenda.
 *
 * Una camiseta en 4 tallas y 3 colores son 12 filas; escribirlas a mano
 * cada vez es donde la gente abandona. Por eso lo primero es el
 * generador de combinaciones y las filas sueltas son la excepción.
 *
 * El resultado viaja al servidor como JSON en un input oculto: es una
 * lista de largo variable, y así la Server Action recibe algo con forma
 * en vez de docenas de campos numerados.
 */
export function EditorVariantes({
  inicial = [],
  nombreCampo = "variantes",
}: {
  inicial?: FilaVariante[];
  nombreCampo?: string;
}) {
  const [filas, setFilas] = useState<FilaVariante[]>(inicial);
  const [tallas, setTallas] = useState("");
  const [colores, setColores] = useState("");

  function cambiar(indice: number, campo: keyof FilaVariante, valor: string) {
    setFilas((previas) =>
      previas.map((fila, i) => {
        if (i !== indice) return fila;
        if (campo === "size" || campo === "color" || campo === "barcode") {
          return { ...fila, [campo]: valor };
        }
        return { ...fila, [campo]: Number(valor.replace(/[^\d]/g, "")) || 0 };
      }),
    );
  }

  function generar() {
    const listaTallas = listaSeparadaPorComas(tallas);
    const listaColores = listaSeparadaPorComas(colores);
    if (listaTallas.length === 0 || listaColores.length === 0) return;

    setFilas((previas) => {
      const existentes = new Set(
        previas.map((f) => `${f.size.toLowerCase()}|${f.color.toLowerCase()}`),
      );
      // El precio y el costo de la primera fila se copian a las nuevas:
      // casi siempre toda la prenda vale lo mismo y así solo hay que
      // corregir las excepciones.
      const modelo = previas[0];
      const nuevas: FilaVariante[] = [];

      for (const talla of listaTallas) {
        for (const color of listaColores) {
          const clave = `${talla.toLowerCase()}|${color.toLowerCase()}`;
          if (existentes.has(clave)) continue;
          existentes.add(clave);
          nuevas.push({
            ...filaVacia(),
            size: talla,
            color,
            cost_price: modelo?.cost_price ?? 0,
            sale_price: modelo?.sale_price ?? 0,
          });
        }
      }

      return [...previas, ...nuevas];
    });

    setTallas("");
    setColores("");
  }

  const total = filas.reduce((suma, f) => suma + f.stock, 0);

  return (
    <div className="flex flex-col gap-5">
      <input type="hidden" name={nombreCampo} value={JSON.stringify(filas)} />

      <div className="bisel border border-humo bg-carbon p-4">
        <p className="mb-4 text-xs tracking-[0.16em] text-gris uppercase">
          Generar combinaciones
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Campo
            etiqueta="Tallas"
            placeholder="S, M, L, XL"
            value={tallas}
            onChange={(e) => setTallas(e.target.value)}
            className="min-w-48 flex-1"
          />
          <Campo
            etiqueta="Colores"
            placeholder="Negro, Blanco"
            value={colores}
            onChange={(e) => setColores(e.target.value)}
            className="min-w-48 flex-1"
          />
          <button
            type="button"
            onClick={generar}
            className="bisel-sm h-12 border border-humo px-5 text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
          >
            Generar
          </button>
        </div>
        <p className="mt-3 text-xs text-gris">
          Separa con comas. Cada talla se cruza con cada color: 4 tallas × 2
          colores son 8 variantes.
        </p>
      </div>

      {filas.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl border-collapse text-left">
            <thead>
              <tr className="border-b border-humo">
                {["Talla", "Color", "Costo", "Precio", "Stock inicial", "Código de fábrica", ""].map(
                  (encabezado) => (
                    <th key={encabezado} className="pb-2 pr-3">
                      <Etiqueta>{encabezado}</Etiqueta>
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => (
                <tr key={i} className="border-b border-humo/50">
                  <td className="py-2 pr-3">
                    <input
                      aria-label={`Talla de la fila ${i + 1}`}
                      value={fila.size}
                      onChange={(e) => cambiar(i, "size", e.target.value)}
                      className={`${CELDA} w-20`}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      aria-label={`Color de la fila ${i + 1}`}
                      value={fila.color}
                      onChange={(e) => cambiar(i, "color", e.target.value)}
                      className={`${CELDA} w-32`}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      inputMode="numeric"
                      aria-label={`Costo de la fila ${i + 1}`}
                      value={fila.cost_price || ""}
                      onChange={(e) => cambiar(i, "cost_price", e.target.value)}
                      className={`${CELDA} w-28 font-mono`}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      inputMode="numeric"
                      aria-label={`Precio de la fila ${i + 1}`}
                      value={fila.sale_price || ""}
                      onChange={(e) => cambiar(i, "sale_price", e.target.value)}
                      className={`${CELDA} w-28 font-mono`}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      inputMode="numeric"
                      aria-label={`Stock de la fila ${i + 1}`}
                      value={fila.stock || ""}
                      onChange={(e) => cambiar(i, "stock", e.target.value)}
                      className={`${CELDA} w-24 font-mono`}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      aria-label={`Código de barras de la fila ${i + 1}`}
                      placeholder="opcional"
                      value={fila.barcode}
                      onChange={(e) => cambiar(i, "barcode", e.target.value)}
                      className={`${CELDA} w-44 font-mono`}
                    />
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => setFilas((p) => p.filter((_, j) => j !== i))}
                      aria-label={`Quitar ${fila.size} ${fila.color}`}
                      className="h-11 px-3 text-gris transition-colors hover:text-rojo"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gris">
          Todavía no hay variantes. El stock vive en la talla y el color, así que
          una prenda sin variantes no se puede vender.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setFilas((p) => [...p, filaVacia()])}
          className="text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:text-blanco"
        >
          + Agregar una suelta
        </button>
        {filas.length > 0 ? (
          <p className="font-mono text-sm text-gris">
            {filas.length} variantes · {total} unidades
          </p>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-gris">
        Deja el código de fábrica vacío si la prenda no trae etiqueta con código
        de barras: el sistema le genera uno interno y la deja en la cola de
        etiquetas por imprimir.
      </p>
    </div>
  );
}
