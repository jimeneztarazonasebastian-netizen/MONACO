"use client";

import { fechaHora, pesos } from "@/lib/formato";
import type { LineaCarrito } from "@/store/pos";

export type DatosTienda = {
  store_name: string;
  address: string | null;
  whatsapp: string | null;
  receipt_footer: string | null;
};

export type TirillaVenta = {
  numero: string;
  fecha: string;
  cajero: string;
  lineas: LineaCarrito[];
  descuento: number;
  total: number;
  pagos: { metodo: string; monto: number }[];
  recibido: number | null;
  devuelta: number | null;
};

const NOMBRE_METODO: Record<string, string> = {
  efectivo: "Efectivo",
  nequi: "Nequi",
  daviplata: "Daviplata",
  bancolombia: "Bancolombia",
  tarjeta: "Tarjeta",
};

/**
 * Lo que sale por la impresora térmica.
 *
 * Está en pantalla siempre pero oculto: el CSS de impresión esconde todo
 * menos este bloque. Dos columnas como máximo, porque en 48 mm útiles
 * una tercera no cabe sin partir palabras.
 */
export function Tirilla({
  venta,
  tienda,
}: {
  venta: TirillaVenta;
  tienda: DatosTienda;
}) {
  const subtotal = venta.lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);

  return (
    <div id="tirilla" className="hidden print:block">
      <div style={{ textAlign: "center", marginBottom: "3mm" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "2px" }}>
          {tienda.store_name.toUpperCase()}
        </div>
        {tienda.address ? <div>{tienda.address}</div> : null}
        {tienda.whatsapp ? <div>WhatsApp {tienda.whatsapp}</div> : null}
      </div>

      <div>
        {venta.numero}
        <br />
        {fechaHora(venta.fecha)}
        <br />
        Atendió: {venta.cajero}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "2mm 0" }} />

      {venta.lineas.map((l) => (
        <div key={l.variantId} style={{ marginBottom: "1.5mm" }}>
          <div>{l.productName}</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>
              {l.size}/{l.color} {l.cantidad} x {pesos(l.precio)}
            </span>
            <span>{pesos(l.precio * l.cantidad)}</span>
          </div>
        </div>
      ))}

      <div style={{ borderTop: "1px dashed #000", margin: "2mm 0" }} />

      {venta.descuento > 0 ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Subtotal</span>
            <span>{pesos(subtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Descuento</span>
            <span>-{pesos(venta.descuento)}</span>
          </div>
        </>
      ) : null}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "13px",
          fontWeight: 700,
          margin: "1mm 0",
        }}
      >
        <span>TOTAL</span>
        <span>{pesos(venta.total)}</span>
      </div>

      {venta.pagos.map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{NOMBRE_METODO[p.metodo] ?? p.metodo}</span>
          <span>{pesos(p.monto)}</span>
        </div>
      ))}

      {venta.recibido !== null ? (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Recibido</span>
          <span>{pesos(venta.recibido)}</span>
        </div>
      ) : null}

      {venta.devuelta !== null && venta.devuelta > 0 ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 700,
          }}
        >
          <span>Cambio</span>
          <span>{pesos(venta.devuelta)}</span>
        </div>
      ) : null}

      <div style={{ borderTop: "1px dashed #000", margin: "2mm 0" }} />

      <div style={{ textAlign: "center" }}>
        {tienda.receipt_footer ? <div>{tienda.receipt_footer}</div> : null}
        <div style={{ marginTop: "1mm" }}>¡Gracias por tu compra!</div>
      </div>
    </div>
  );
}
