"use client";

import { useState } from "react";

import { fechaHora, pesos } from "@/lib/formato";
import { anularPedido, confirmarPedido, guardarGuia } from "@/lib/actions/pedidos";
import { enlaceACliente, mensajeGuia, normalizarNumero } from "@/lib/whatsapp";
import type { MetodoPago } from "@/types/database";

/**
 * Las que reparten en Colombia. Es una lista de atajos, no un enum: el
 * campo admite cualquier texto porque mañana pueden usar otra.
 */
const TRANSPORTADORAS = [
  "Interrapidísimo",
  "Servientrega",
  "Coordinadora",
  "Envía",
  "TCC",
  "Domicilio propio",
];

const METODOS: { valor: MetodoPago; etiqueta: string }[] = [
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "nequi", etiqueta: "Nequi" },
  { valor: "daviplata", etiqueta: "Daviplata" },
  { valor: "bancolombia", etiqueta: "Bancolombia" },
  { valor: "tarjeta", etiqueta: "Tarjeta" },
];

export type Pedido = {
  id: string;
  number: string;
  status: string;
  total: number;
  created_at: string;
  notes: string | null;
  shipping_carrier: string | null;
  tracking_number: string | null;
  customers: {
    full_name: string;
    phone: string | null;
    address: string | null;
  } | null;
  sale_items: {
    id: string;
    product_name: string;
    size: string | null;
    color: string | null;
    quantity: number;
    unit_price: number;
  }[];
};

export function TarjetaPedido({ pedido }: { pedido: Pedido }) {
  const [metodo, setMetodo] = useState<MetodoPago>("nequi");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transportadora, setTransportadora] = useState(
    pedido.shipping_carrier ?? "",
  );
  const [guia, setGuia] = useState(pedido.tracking_number ?? "");
  const [guardada, setGuardada] = useState(false);

  const pendiente = pedido.status === "pendiente";
  const telefono = normalizarNumero(pedido.customers?.phone);

  // El despacho sólo tiene sentido cuando la venta ya se cerró: un pedido
  // pendiente todavía no se ha cobrado y uno anulado no sale a ningún
  // lado.
  const despachable = pedido.status === "pagada";
  const hayGuia = transportadora.trim() !== "" && guia.trim() !== "";

  const avisoWhatsapp =
    telefono && hayGuia
      ? enlaceACliente(
          telefono,
          mensajeGuia(
            pedido.number,
            pedido.customers?.full_name ?? "",
            transportadora,
            guia,
          ),
        )
      : null;

  async function anotarGuia() {
    setTrabajando(true);
    setError(null);
    const r = await guardarGuia(pedido.id, transportadora, guia);
    setTrabajando(false);
    if (!r.ok) setError(r.error ?? "No se pudo guardar la guía.");
    else setGuardada(true);
  }

  async function confirmar() {
    setTrabajando(true);
    setError(null);
    const r = await confirmarPedido(pedido.id, metodo);
    setTrabajando(false);
    if (!r.ok) setError(r.error ?? "No se pudo confirmar.");
  }

  async function anular() {
    if (!window.confirm(`¿Anular el pedido ${pedido.number}?`)) return;
    setTrabajando(true);
    await anularPedido(pedido.id);
    setTrabajando(false);
  }

  return (
    <article
      className={`bisel border border-humo bg-carbon p-5 ${pendiente ? "" : "opacity-60"}`}
    >
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <span className="fuente-display text-base">{pedido.number}</span>
        <span className="text-xs text-gris">{fechaHora(pedido.created_at)}</span>
      </header>

      <div className="mb-4">
        <p className="text-sm text-blanco">
          {pedido.customers?.full_name ?? "Sin nombre"}
        </p>
        {pedido.customers?.phone ? (
          <p className="font-mono text-xs text-gris">
            {pedido.customers.phone}
            {telefono ? (
              <>
                {" · "}
                <a
                  href={`https://wa.me/${telefono}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline transition-colors hover:text-blanco"
                >
                  escribirle
                </a>
              </>
            ) : null}
          </p>
        ) : null}
        {pedido.customers?.address ? (
          <p className="text-xs text-gris">{pedido.customers.address}</p>
        ) : null}
      </div>

      <ul className="mb-4 flex flex-col gap-1 border-t border-humo pt-3">
        {pedido.sale_items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3 text-sm">
            <span className="text-gris">
              {i.quantity} × {i.product_name}
              <span className="font-mono text-xs">
                {" "}
                {i.size}/{i.color}
              </span>
            </span>
            <span className="font-mono text-blanco">
              {pesos(i.unit_price * i.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mb-4 flex items-baseline justify-between border-t border-humo pt-3">
        <span className="text-xs tracking-[0.16em] text-gris uppercase">Total</span>
        <span className="font-mono text-lg text-blanco">{pesos(pedido.total)}</span>
      </div>

      {pendiente ? (
        <>
          <p className="mb-3 text-xs leading-relaxed text-gris">
            El inventario todavía no se ha movido. Se descuenta al confirmar.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label={`Método de pago del pedido ${pedido.number}`}
              value={metodo}
              onChange={(e) => setMetodo(e.target.value as MetodoPago)}
              className="h-12 flex-1 border border-humo bg-negro px-3 text-sm text-blanco focus:border-gris focus:outline-none"
            >
              {METODOS.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={confirmar}
              disabled={trabajando}
              className="bisel-sm h-12 bg-rojo px-5 text-xs font-semibold tracking-[0.16em] text-blanco uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {trabajando ? "…" : "Confirmar"}
            </button>

            <button
              type="button"
              onClick={anular}
              disabled={trabajando}
              className="h-12 border border-humo px-4 text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:border-rojo hover:text-rojo disabled:opacity-40"
            >
              Anular
            </button>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-4 border-l-2 border-rojo bg-rojo/10 px-4 py-3 text-sm"
            >
              {error}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-xs tracking-[0.16em] text-gris uppercase">
          {pedido.status === "pagada" ? "Confirmado" : "Anulado"}
        </p>
      )}

      {/* --- Despacho ---
          Aparece sólo cuando la venta ya está cobrada. La guía se anota
          aquí y se le manda al cliente con un solo toque, en vez de
          quedarse escrita únicamente en la conversación de WhatsApp. */}
      {despachable ? (
        <div className="mt-5 border-t border-humo pt-4">
          <p className="mb-3 text-xs tracking-[0.16em] text-gris uppercase">
            Envío
          </p>

          <div className="flex flex-col gap-3">
            <input
              list={`transportadoras-${pedido.id}`}
              value={transportadora}
              onChange={(e) => {
                setTransportadora(e.target.value);
                setGuardada(false);
              }}
              placeholder="Transportadora"
              aria-label={`Transportadora del pedido ${pedido.number}`}
              className="h-12 border border-humo bg-negro px-3 text-sm text-blanco placeholder:text-gris focus:border-gris focus:outline-none"
            />
            <datalist id={`transportadoras-${pedido.id}`}>
              {TRANSPORTADORAS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>

            <input
              value={guia}
              onChange={(e) => {
                setGuia(e.target.value);
                setGuardada(false);
              }}
              placeholder="Número de guía"
              aria-label={`Número de guía del pedido ${pedido.number}`}
              className="h-12 border border-humo bg-negro px-3 font-mono text-sm text-blanco placeholder:font-sans placeholder:text-gris focus:border-gris focus:outline-none"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={anotarGuia}
                disabled={trabajando}
                className="h-12 border border-humo px-5 text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco disabled:opacity-40"
              >
                {trabajando ? "…" : guardada ? "Guardada" : "Guardar guía"}
              </button>

              {avisoWhatsapp ? (
                // Ancla y no `window.open`: los bloqueadores se comen lo
                // segundo, igual que en el checkout del catálogo.
                <a
                  href={avisoWhatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bisel-sm inline-flex h-12 items-center bg-rojo px-5 text-xs font-semibold tracking-[0.16em] text-blanco uppercase transition-opacity hover:opacity-90"
                >
                  Avisar por WhatsApp
                </a>
              ) : null}
            </div>

            {!telefono && hayGuia ? (
              <p className="text-xs text-gris">
                Este pedido no tiene teléfono, así que no se le puede avisar
                desde aquí.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
