"use client";

import { useState } from "react";

import { pesos } from "@/lib/formato";
import type { MetodoPago } from "@/types/database";

const METODOS: { valor: MetodoPago; etiqueta: string }[] = [
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "nequi", etiqueta: "Nequi" },
  { valor: "daviplata", etiqueta: "Daviplata" },
  { valor: "bancolombia", etiqueta: "Bancolombia" },
  { valor: "tarjeta", etiqueta: "Tarjeta" },
];

export type FilaPago = { metodo: MetodoPago; monto: number };

const CLASE_NUM =
  "h-14 w-full border border-humo bg-negro px-3 text-right font-mono text-xl text-blanco focus:border-gris focus:outline-none";

export function PanelCobro({
  total,
  procesando,
  error,
  onCobrar,
  onCancelar,
}: {
  total: number;
  procesando: boolean;
  error: string | null;
  onCobrar: (pagos: FilaPago[], recibido: number | null) => void;
  onCancelar: () => void;
}) {
  const [pagos, setPagos] = useState<FilaPago[]>([
    { metodo: "efectivo", monto: total },
  ]);
  const [recibido, setRecibido] = useState<number>(0);

  const pagado = pagos.reduce((s, p) => s + p.monto, 0);
  const falta = total - pagado;
  const hayEfectivo = pagos.some((p) => p.metodo === "efectivo");
  const efectivo = pagos
    .filter((p) => p.metodo === "efectivo")
    .reduce((s, p) => s + p.monto, 0);
  const cambio = recibido > 0 ? recibido - efectivo : 0;

  const puedeCobrar = falta <= 0 && !procesando && (!hayEfectivo || recibido >= efectivo || recibido === 0);

  function cambiar(indice: number, campo: keyof FilaPago, valor: string) {
    setPagos((previos) =>
      previos.map((p, i) =>
        i !== indice
          ? p
          : campo === "metodo"
            ? { ...p, metodo: valor as MetodoPago }
            : { ...p, monto: Number(valor.replace(/[^\d]/g, "")) || 0 },
      ),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between border-b border-humo pb-4">
        <span className="text-sm tracking-[0.16em] text-gris uppercase">
          Total a cobrar
        </span>
        <span className="fuente-display text-3xl text-blanco">{pesos(total)}</span>
      </div>

      <div className="flex flex-col gap-3">
        {pagos.map((pago, i) => (
          <div key={i} className="flex flex-wrap items-center gap-3">
            <select
              aria-label={`Método de pago ${i + 1}`}
              value={pago.metodo}
              onChange={(e) => cambiar(i, "metodo", e.target.value)}
              className="h-14 min-w-40 flex-1 border border-humo bg-negro px-3 text-base text-blanco focus:border-gris focus:outline-none"
            >
              {METODOS.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </select>

            <input
              aria-label={`Monto del pago ${i + 1}`}
              inputMode="numeric"
              value={pago.monto || ""}
              onChange={(e) => cambiar(i, "monto", e.target.value)}
              className={`${CLASE_NUM} w-44 flex-none`}
            />

            {pagos.length > 1 ? (
              <button
                type="button"
                onClick={() => setPagos((p) => p.filter((_, j) => j !== i))}
                aria-label={`Quitar el pago ${i + 1}`}
                className="h-14 px-4 text-gris transition-colors hover:text-rojo"
              >
                ✕
              </button>
            ) : null}
          </div>
        ))}

        {falta > 0 ? (
          <button
            type="button"
            onClick={() =>
              setPagos((p) => [...p, { metodo: "nequi", monto: falta }])
            }
            className="self-start text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:text-blanco"
          >
            + Pago mixto: agregar otro método
          </button>
        ) : null}
      </div>

      {hayEfectivo ? (
        <div className="flex flex-wrap items-end gap-4 border-t border-humo pt-5">
          <label className="flex flex-col gap-2">
            <span className="text-xs tracking-[0.16em] text-gris uppercase">
              Con cuánto paga
            </span>
            <input
              inputMode="numeric"
              value={recibido || ""}
              onChange={(e) =>
                setRecibido(Number(e.target.value.replace(/[^\d]/g, "")) || 0)
              }
              placeholder={String(efectivo)}
              className={`${CLASE_NUM} w-48`}
            />
          </label>

          {recibido > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs tracking-[0.16em] text-gris uppercase">
                Cambio
              </span>
              <span
                className={`fuente-display text-3xl ${cambio < 0 ? "text-rojo" : "text-blanco"}`}
              >
                {cambio < 0 ? "falta " : ""}
                {pesos(Math.abs(cambio))}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {falta > 0 ? (
        <p className="border-l-2 border-rojo bg-rojo/10 px-4 py-3 font-mono text-sm">
          Faltan {pesos(falta)} por cubrir.
        </p>
      ) : null}

      {falta < 0 ? (
        <p className="text-sm text-gris">
          Los pagos suman {pesos(Math.abs(falta))} de más. Ajusta los montos.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="border-l-2 border-rojo bg-rojo/10 px-4 py-3 text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!puedeCobrar}
          onClick={() => onCobrar(pagos, hayEfectivo && recibido > 0 ? recibido : null)}
          className="bisel-sm h-16 flex-1 bg-rojo px-8 text-sm font-semibold tracking-[0.2em] text-blanco uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {procesando ? "Registrando…" : "Confirmar venta"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={procesando}
          className="bisel-sm h-16 border border-humo px-8 text-sm tracking-[0.2em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco disabled:opacity-40"
        >
          Volver
        </button>
      </div>
    </div>
  );
}
