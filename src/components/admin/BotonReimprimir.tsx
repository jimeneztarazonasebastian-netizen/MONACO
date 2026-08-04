"use client";

import {
  Tirilla,
  type DatosTienda,
  type TirillaVenta,
} from "@/components/pos/Tirilla";
import { imprimir58mm } from "@/lib/imprimir";

/**
 * Reimpresión de una tirilla vieja.
 *
 * Lo que sale por la impresora se arma con lo que quedó congelado en
 * `sale_items` —nombre, talla y precio del día de la venta—, no con lo
 * que dice el catálogo hoy. Si la prenda subió de precio o se archivó,
 * la copia tiene que seguir mostrando lo que el cliente pagó.
 */
export function BotonReimprimir({
  venta,
  tienda,
}: {
  venta: TirillaVenta;
  tienda: DatosTienda;
}) {
  return (
    <>
      <Tirilla venta={venta} tienda={tienda} />
      <button
        type="button"
        onClick={() => imprimir58mm("#tirilla")}
        className="bisel-sm h-14 bg-rojo px-8 text-xs font-semibold tracking-[0.2em] text-blanco uppercase transition-opacity hover:opacity-90 print:hidden"
      >
        Reimprimir tirilla
      </button>
    </>
  );
}
