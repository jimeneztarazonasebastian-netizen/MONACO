"use client";

import JsBarcode from "jsbarcode";
import { useEffect, useRef, useState } from "react";

import { LogoTinta } from "@/components/ui/LogoMonaco";
import { marcarEtiquetasImpresas } from "@/lib/actions/inventario";
import { pesos } from "@/lib/formato";
import { imprimir58mm } from "@/lib/imprimir";

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

/**
 * Una etiqueta, con las medidas en milímetros que va a tener en papel.
 *
 * La usan la vista previa y el bloque que sale por la impresora, a
 * propósito: si cada una tuviera su copia del diseño, la previa dejaría
 * de parecerse a lo que imprime en cuanto alguien tocara una sola.
 */
function Etiqueta({
  v,
  slogan,
}: {
  v: VariantePendiente;
  slogan: string | null;
}) {
  return (
    <div
      data-etiqueta
      style={{
        paddingBottom: "3mm",
        marginBottom: "3mm",
        borderBottom: "1px dashed #000",
        textAlign: "center",
        // El papel mide lo que mide una etiqueta, así que cada una cae en
        // su propia página. Sin esto, una etiqueta podría quedar partida
        // entre dos y salir cortada por la mitad.
        breakInside: "avoid",
      }}
    >
      {/* La marca va arriba: la etiqueta viaja colgada de la prenda y a
          veces es lo único que el cliente conserva. Como en la tirilla,
          el logo ya trae el nombre y no se repite al lado. */}
      <LogoTinta ancho={26} />

      {slogan ? (
        <div style={{ fontSize: "7px", letterSpacing: "1.5px", textTransform: "uppercase" }}>
          {slogan}
        </div>
      ) : null}

      <div style={{ borderTop: "1px solid #000", margin: "1.5mm 0" }} />

      <div style={{ fontSize: "11px", fontWeight: 700, lineHeight: 1.25 }}>
        {v.product}
      </div>
      <div style={{ fontSize: "10px", letterSpacing: "1px" }}>
        TALLA {v.size.toUpperCase()} · {v.color.toUpperCase()}
      </div>

      <div style={{ fontSize: "18px", fontWeight: 700, margin: "1.5mm 0 1mm" }}>
        {pesos(v.sale_price)}
      </div>

      <CodigoBarras codigo={v.barcode} />

      <div style={{ fontSize: "7px", letterSpacing: "0.5px", marginTop: "0.5mm" }}>
        {v.sku}
      </div>
    </div>
  );
}

export function ColaEtiquetas({
  pendientes,
  slogan,
}: {
  pendientes: VariantePendiente[];
  slogan: string | null;
}) {
  const [elegidas, setElegidas] = useState<Set<string>>(
    () => new Set(pendientes.map((p) => p.id)),
  );
  const [marcando, setMarcando] = useState(false);
  const [ampliada, setAmpliada] = useState(false);

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
    imprimir58mm("#etiquetas", "[data-etiqueta]");

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

      {/* --- Vista previa ---
          El bloque de abajo es el que imprime, y en pantalla está en
          `display:none` siempre. Sin esto, la única forma de ver una
          etiqueta antes de gastar papel era abrir el diálogo de
          impresión del navegador, que en el celular ni siquiera
          aparece. Va en papel blanco porque eso es lo que es. */}
      {seleccionadas.length > 0 ? (
        <section className="print:hidden">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xs tracking-[0.16em] text-gris uppercase">
              Vista previa · {ampliada ? "ampliada al doble" : "tamaño real"}
            </h2>
            <button
              type="button"
              onClick={() => setAmpliada((a) => !a)}
              className="border border-humo px-4 py-2 text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
            >
              {ampliada ? "Tamaño real" : "Ampliar"}
            </button>
          </div>

          <div className="max-h-[70vh] overflow-auto border border-humo bg-humo p-4">
            {/* El zoom vive aquí y nunca en `#etiquetas`: una
                transformación sobre el bloque que imprime le cambia el
                tamaño en el papel. */}
            <div
              style={{
                transform: ampliada ? "scale(2)" : "none",
                transformOrigin: "top left",
                width: ampliada ? "116mm" : "58mm",
              }}
            >
              <div
                style={{
                  width: "58mm",
                  padding: "2mm",
                  background: "#fff",
                  color: "#000",
                  fontFamily: "var(--fuente-mono), ui-monospace, monospace",
                }}
              >
                {seleccionadas.map((v) => (
                  <Etiqueta key={v.id} v={v} slogan={slogan} />
                ))}
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-gris">
            Así salen las {seleccionadas.length} seguidas por el rollo de 58 mm,
            separadas por la línea de corte. Al imprimir hay que dejar los
            márgenes en cero y desactivar encabezado y pie del navegador.
          </p>
        </section>
      ) : null}

      {/* Lo único que sale por la impresora */}
      <div id="etiquetas" className="hidden print:block">
        {seleccionadas.map((v) => (
          <Etiqueta key={v.id} v={v} slogan={slogan} />
        ))}
      </div>
    </div>
  );
}
