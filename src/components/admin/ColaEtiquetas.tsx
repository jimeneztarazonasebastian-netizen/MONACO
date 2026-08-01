"use client";

import JsBarcode from "jsbarcode";
import { useEffect, useRef, useState } from "react";

import { marcarEtiquetasImpresas } from "@/lib/actions/inventario";
import { pesos } from "@/lib/formato";

export type VariantePendiente = {
  id: string;
  product: string;
  sku: string;
  barcode: string;
  size: string;
  color: string;
  sale_price: number;
  stock: number;
};

/**
 * Dibuja el código de barras.
 *
 * Los internos son EAN-13 válidos y se dibujan como tales. Un código de
 * fábrica puede venir en otro formato, así que si no son 13 dígitos se
 * cae a CODE128, que acepta cualquier cosa. Sin ese respaldo, JsBarcode
 * lanza y la etiqueta sale en blanco.
 */
function CodigoBarras({ codigo }: { codigo: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, codigo, {
        format: /^\d{13}$/.test(codigo) ? "EAN13" : "CODE128",
        width: 1.6,
        height: 38,
        fontSize: 13,
        margin: 0,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      // Un código ilegible no debe tumbar la pantalla entera.
    }
  }, [codigo]);

  return <svg ref={ref} />;
}

export function ColaEtiquetas({ pendientes }: { pendientes: VariantePendiente[] }) {
  const [elegidas, setElegidas] = useState<Set<string>>(
    () => new Set(pendientes.map((p) => p.id)),
  );
  const [marcando, setMarcando] = useState(false);

  const seleccionadas = pendientes.filter((p) => elegidas.has(p.id));

  function alternar(id: string) {
    setElegidas((previas) => {
      const nuevas = new Set(previas);
      if (nuevas.has(id)) nuevas.delete(id);
      else nuevas.add(id);
      return nuevas;
    });
  }

  async function imprimirYMarcar() {
    if (seleccionadas.length === 0) return;
    window.print();

    // Se marca después de mandar a imprimir, y se pregunta: si la
    // impresora se traba, la prenda tiene que seguir en la cola.
    const salieron = window.confirm(
      `¿Salieron bien las ${seleccionadas.length} etiquetas? Si aceptas, se quitan de la cola.`,
    );
    if (!salieron) return;

    setMarcando(true);
    await marcarEtiquetasImpresas(seleccionadas.map((s) => s.id));
    setMarcando(false);
  }

  if (pendientes.length === 0) {
    return (
      <p className="text-sm text-gris">
        No hay etiquetas pendientes. Aquí caen las prendas que llegaron sin
        código de fábrica: el sistema les genera uno interno y esperan a que se
        les imprima la etiqueta.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-gris">
          {seleccionadas.length} de {pendientes.length} seleccionadas
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() =>
              setElegidas(
                elegidas.size === pendientes.length
                  ? new Set()
                  : new Set(pendientes.map((p) => p.id)),
              )
            }
            className="border border-humo px-4 py-3 text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
          >
            {elegidas.size === pendientes.length ? "Ninguna" : "Todas"}
          </button>
          <button
            type="button"
            onClick={imprimirYMarcar}
            disabled={seleccionadas.length === 0 || marcando}
            className="bisel-sm bg-rojo px-6 py-3 text-xs font-semibold tracking-[0.16em] text-blanco uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {marcando ? "Guardando…" : "Imprimir etiquetas"}
          </button>
        </div>
      </div>

      <ul className="flex flex-col print:hidden">
        {pendientes.map((v) => (
          <li
            key={v.id}
            className="flex flex-wrap items-center gap-4 border-b border-humo py-4"
          >
            <input
              type="checkbox"
              checked={elegidas.has(v.id)}
              onChange={() => alternar(v.id)}
              aria-label={`Elegir ${v.product} ${v.size}`}
              className="h-5 w-5 accent-rojo"
            />
            <span className="min-w-48 flex-1">
              <span className="block text-sm text-blanco">{v.product}</span>
              <span className="block font-mono text-xs text-gris">
                {v.size} · {v.color} · {v.stock} en bodega
              </span>
            </span>
            <span className="font-mono text-xs text-gris">{v.barcode}</span>
            <span className="font-mono text-sm text-blanco">
              {pesos(v.sale_price)}
            </span>
          </li>
        ))}
      </ul>

      {/* Lo único que sale por la impresora */}
      <div id="etiquetas" className="hidden print:block">
        {seleccionadas.map((v) => (
          <div
            key={v.id}
            style={{
              borderBottom: "1px dashed #000",
              paddingBottom: "2mm",
              marginBottom: "2mm",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700 }}>{v.product}</div>
            <div style={{ fontSize: "10px" }}>
              {v.size} · {v.color}
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, margin: "1mm 0" }}>
              {pesos(v.sale_price)}
            </div>
            <CodigoBarras codigo={v.barcode} />
          </div>
        ))}
      </div>
    </div>
  );
}
