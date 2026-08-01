"use client";

import { useState } from "react";

import { fechaHora, pesos } from "@/lib/formato";
import { anularPedido, confirmarPedido } from "@/lib/actions/pedidos";
import { normalizarNumero } from "@/lib/whatsapp";
import type { MetodoPago } from "@/types/database";

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

  const pendiente = pedido.status === "pendiente";
  const telefono = normalizarNumero(pedido.customers?.phone);

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
    </article>
  );
}
