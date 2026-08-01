"use client";

import { fechaHora, pesos } from "@/lib/formato";
import { normalizarNumero } from "@/lib/whatsapp";

/**
 * Lo mínimo que necesita una línea para imprimirse.
 *
 * Se define aquí y no se toma del carrito del POS porque la tirilla se
 * imprime en dos momentos: al cerrar la venta, desde el carrito en
 * memoria, y al reimprimirla meses después, desde `sale_items`. Las
 * líneas del carrito encajan por forma, sin conversión.
 */
export type LineaTirilla = {
  variantId: string;
  productName: string;
  size: string;
  color: string;
  precio: number;
  cantidad: number;
};

export type DatosTienda = {
  store_name: string;
  slogan: string | null;
  address: string | null;
  whatsapp: string | null;
  receipt_footer: string | null;
};

export type TirillaVenta = {
  numero: string;
  fecha: string;
  cajero: string;
  lineas: LineaTirilla[];
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

/** Línea de guiones. En térmica imprime mejor que un borde de 1px. */
function Separador({ doble = false }: { doble?: boolean }) {
  return (
    <div
      style={{
        borderTop: doble ? "2px solid #000" : "1px dashed #000",
        margin: doble ? "1.5mm 0" : "1.2mm 0",
      }}
    />
  );
}

function Fila({
  izquierda,
  derecha,
  fuerte = false,
  grande = false,
}: {
  izquierda: string;
  derecha: string;
  fuerte?: boolean;
  grande?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "2mm",
        fontWeight: fuerte ? 700 : 400,
        fontSize: grande ? "14px" : "10px",
        lineHeight: 1.45,
      }}
    >
      <span>{izquierda}</span>
      <span style={{ whiteSpace: "nowrap" }}>{derecha}</span>
    </div>
  );
}

/**
 * Tirilla térmica de 58 mm.
 *
 * Está en pantalla siempre pero oculta: el CSS de impresión esconde todo
 * menos este bloque. El ancho útil real ronda los 48 mm, así que no hay
 * tablas de más de dos columnas y los nombres largos bajan de renglón en
 * vez de partirse.
 *
 * El monograma va en SVG y no como imagen: una térmica lo imprime nítido
 * a cualquier tamaño y no hay que subir ningún archivo.
 */
export function Tirilla({
  venta,
  tienda,
}: {
  venta: TirillaVenta;
  tienda: DatosTienda;
}) {
  const subtotal = venta.lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
  const unidades = venta.lineas.reduce((s, l) => s + l.cantidad, 0);
  const whatsapp = normalizarNumero(tienda.whatsapp);

  return (
    <div id="tirilla" className="hidden print:block">
      {/* --- Marca --- */}
      <div style={{ textAlign: "center", marginBottom: "2mm" }}>
        <svg
          viewBox="0 0 40 40"
          width="34"
          height="34"
          fill="none"
          style={{ display: "block", margin: "0 auto 1.5mm" }}
          aria-hidden="true"
        >
          <path
            d="M5 33V7l15 18L35 7v26"
            stroke="#000"
            strokeWidth="3.5"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>

        <div
          style={{
            fontSize: "17px",
            fontWeight: 700,
            letterSpacing: "4px",
            lineHeight: 1.1,
          }}
        >
          {tienda.store_name.toUpperCase()}
        </div>

        {tienda.slogan ? (
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginTop: "0.8mm",
            }}
          >
            {tienda.slogan}
          </div>
        ) : null}
      </div>

      {tienda.address || whatsapp ? (
        <div style={{ textAlign: "center", fontSize: "9px", lineHeight: 1.4 }}>
          {tienda.address ? <div>{tienda.address}</div> : null}
          {tienda.whatsapp ? <div>WhatsApp {tienda.whatsapp}</div> : null}
        </div>
      ) : null}

      <Separador doble />

      {/* --- Datos de la venta --- */}
      <div
        style={{
          textAlign: "center",
          fontSize: "13px",
          fontWeight: 700,
          letterSpacing: "1px",
        }}
      >
        {venta.numero}
      </div>
      <div style={{ textAlign: "center", fontSize: "9px", lineHeight: 1.4 }}>
        {fechaHora(venta.fecha)}
        <br />
        Atendió: {venta.cajero}
      </div>

      <Separador />

      {/* --- Prendas --- */}
      {venta.lineas.map((l) => (
        <div key={l.variantId} style={{ marginBottom: "1.5mm" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, lineHeight: 1.3 }}>
            {l.productName}
          </div>
          <Fila
            izquierda={`${l.size} · ${l.color}   ${l.cantidad} × ${pesos(l.precio)}`}
            derecha={pesos(l.precio * l.cantidad)}
          />
        </div>
      ))}

      <Separador />

      {/* --- Totales --- */}
      {venta.descuento > 0 ? (
        <>
          <Fila izquierda="Subtotal" derecha={pesos(subtotal)} />
          <Fila izquierda="Descuento" derecha={`-${pesos(venta.descuento)}`} />
        </>
      ) : null}

      <Separador doble />
      <Fila izquierda="TOTAL" derecha={pesos(venta.total)} fuerte grande />
      <Separador doble />

      {venta.pagos.map((p, i) => (
        <Fila
          key={i}
          izquierda={NOMBRE_METODO[p.metodo] ?? p.metodo}
          derecha={pesos(p.monto)}
        />
      ))}

      {venta.recibido !== null ? (
        <Fila izquierda="Recibido" derecha={pesos(venta.recibido)} />
      ) : null}

      {venta.devuelta !== null && venta.devuelta > 0 ? (
        <Fila izquierda="Cambio" derecha={pesos(venta.devuelta)} fuerte />
      ) : null}

      <Separador />

      <div style={{ textAlign: "center", fontSize: "9px" }}>
        {unidades} {unidades === 1 ? "prenda" : "prendas"}
      </div>

      {/* --- Pie --- */}
      {tienda.receipt_footer ? (
        <>
          <Separador />
          <div
            style={{
              textAlign: "center",
              fontSize: "9px",
              lineHeight: 1.4,
              fontWeight: 700,
            }}
          >
            {tienda.receipt_footer}
          </div>
        </>
      ) : null}

      <Separador />

      <div
        style={{
          textAlign: "center",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "1px",
          marginBottom: "0.8mm",
        }}
      >
        ¡GRACIAS POR TU COMPRA!
      </div>

      {whatsapp ? (
        <div style={{ textAlign: "center", fontSize: "8px" }}>
          Escríbenos por WhatsApp para cambios o pedidos
        </div>
      ) : null}

      {/* Espacio para que la cuchilla no corte el texto. */}
      <div style={{ height: "8mm" }} />
    </div>
  );
}
