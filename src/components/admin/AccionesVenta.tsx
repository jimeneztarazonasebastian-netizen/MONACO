"use client";

import { useState } from "react";

import { pesos } from "@/lib/formato";
import { anularVenta, devolverPrendas } from "@/lib/actions/ventas";

export type ItemDevolvible = {
  id: string;
  product_name: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unit_price: number;
  /** Ya devuelto en devoluciones anteriores. */
  devuelto: number;
};

const CLASE_CAMPO =
  "h-12 w-full border border-humo bg-negro px-3 text-base text-blanco placeholder:text-gris focus:border-gris focus:outline-none";

export function AccionesVenta({
  ventaId,
  numero,
  items,
  anulada,
}: {
  ventaId: string;
  numero: string;
  items: ItemDevolvible[];
  anulada: boolean;
}) {
  const [panel, setPanel] = useState<null | "anular" | "devolver">(null);
  const [motivo, setMotivo] = useState("");
  const [reintegro, setReintegro] = useState(true);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  const devolvibles = items.filter((i) => i.quantity - i.devuelto > 0);
  const totalElegido = devolvibles.reduce(
    (s, i) => s + (cantidades[i.id] ?? 0) * i.unit_price,
    0,
  );

  async function confirmarAnulacion() {
    setTrabajando(true);
    setError(null);
    const r = await anularVenta(ventaId, motivo, reintegro);
    setTrabajando(false);
    if (!r.ok) {
      setError(r.error ?? "No se pudo anular.");
      return;
    }
    setHecho(`Venta ${numero} anulada. El stock volvió al inventario.`);
    setPanel(null);
    setMotivo("");
  }

  async function confirmarDevolucion() {
    const elegidos = Object.entries(cantidades)
      .filter(([, q]) => q > 0)
      .map(([sale_item_id, quantity]) => ({ sale_item_id, quantity }));

    if (elegidos.length === 0) {
      setError("Elige cuántas prendas se devuelven.");
      return;
    }

    setTrabajando(true);
    setError(null);
    const r = await devolverPrendas(ventaId, elegidos, motivo, reintegro);
    setTrabajando(false);
    if (!r.ok) {
      setError(r.error ?? "No se pudo registrar la devolución.");
      return;
    }
    setHecho(
      `Devolución registrada por ${pesos(r.devuelto ?? 0)}. El stock volvió al inventario.`,
    );
    setPanel(null);
    setMotivo("");
    setCantidades({});
  }

  if (anulada) {
    return (
      <p className="text-xs tracking-[0.16em] text-rojo uppercase print:hidden">
        Venta anulada — el stock ya volvió al inventario
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 print:hidden">
      {hecho ? (
        <p className="border-l-2 border-rojo bg-rojo/10 px-4 py-3 text-sm">{hecho}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            setPanel(panel === "devolver" ? null : "devolver");
            setError(null);
          }}
          disabled={devolvibles.length === 0}
          className="bisel-sm h-12 border border-humo px-5 text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco disabled:opacity-40"
        >
          Devolver prendas
        </button>
        <button
          type="button"
          onClick={() => {
            setPanel(panel === "anular" ? null : "anular");
            setError(null);
          }}
          className="bisel-sm h-12 border border-humo px-5 text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:border-rojo hover:text-rojo"
        >
          Anular la venta
        </button>
      </div>

      {panel === "anular" ? (
        <div className="bisel border border-humo bg-carbon p-5">
          <p className="mb-4 text-sm leading-relaxed text-gris">
            Se devuelve al inventario <strong className="text-blanco">todo</strong>{" "}
            lo que llevaba esta venta y queda marcada como anulada. La venta no
            se borra: el número {numero} sigue existiendo, con el motivo escrito.
            Si solo se devuelve una prenda, usa{" "}
            <strong className="text-blanco">Devolver prendas</strong>.
          </p>

          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Se cobró de más, el cliente se arrepintió…"
            className={CLASE_CAMPO}
            aria-label="Motivo de la anulación"
          />

          <label className="mt-4 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={reintegro}
              onChange={(e) => setReintegro(e.target.checked)}
              className="h-5 w-5 accent-rojo"
            />
            <span className="text-sm text-blanco">
              La plata en efectivo sale del cajón ahora
              <span className="block text-xs text-gris">
                Solo lo que no se haya devuelto ya. Desmárcalo si se pagó por
                Nequi o tarjeta, o si el reintegro se hace después.
              </span>
            </span>
          </label>

          {error ? (
            <p role="alert" className="mt-4 border-l-2 border-rojo bg-rojo/10 px-4 py-3 text-sm">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={confirmarAnulacion}
            disabled={trabajando || motivo.trim().length === 0}
            className="bisel-sm mt-4 h-12 bg-rojo px-6 text-xs font-semibold tracking-[0.16em] text-blanco uppercase disabled:opacity-40"
          >
            {trabajando ? "Anulando…" : "Confirmar anulación"}
          </button>
        </div>
      ) : null}

      {panel === "devolver" ? (
        <div className="bisel border border-humo bg-carbon p-5">
          <p className="mb-4 text-sm leading-relaxed text-gris">
            Elige cuántas unidades vuelven. Para un cambio de talla, devuelve la
            que no sirvió aquí y vende la otra en la caja: así el stock de cada
            talla queda bien.
          </p>

          <ul className="mb-5 flex flex-col">
            {devolvibles.map((i) => {
              const disponible = i.quantity - i.devuelto;
              const elegida = cantidades[i.id] ?? 0;
              return (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-humo py-3"
                >
                  <span className="min-w-40 flex-1">
                    <span className="block text-sm text-blanco">
                      {i.product_name}
                    </span>
                    <span className="block font-mono text-xs text-gris">
                      {i.size} · {i.color} · {pesos(i.unit_price)} c/u
                      {i.devuelto > 0 ? ` · ${i.devuelto} ya devuelta(s)` : ""}
                    </span>
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setCantidades((c) => ({
                          ...c,
                          [i.id]: Math.max(0, elegida - 1),
                        }))
                      }
                      aria-label={`Menos de ${i.product_name}`}
                      className="h-11 w-11 border border-humo text-lg text-blanco transition-colors hover:border-gris"
                    >
                      −
                    </button>
                    <span className="w-14 text-center font-mono text-base text-blanco">
                      {elegida} / {disponible}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCantidades((c) => ({
                          ...c,
                          [i.id]: Math.min(disponible, elegida + 1),
                        }))
                      }
                      disabled={elegida >= disponible}
                      aria-label={`Más de ${i.product_name}`}
                      className="h-11 w-11 border border-humo text-lg text-blanco transition-colors hover:border-gris disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="No le quedó, salió con defecto…"
            className={CLASE_CAMPO}
            aria-label="Motivo de la devolución"
          />

          <label className="mt-4 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={reintegro}
              onChange={(e) => setReintegro(e.target.checked)}
              className="h-5 w-5 accent-rojo"
            />
            <span className="text-sm text-blanco">
              La plata sale del cajón ahora
              <span className="block text-xs text-gris">
                Queda como salida de efectivo del turno. Desmárcalo si se
                devolvió por Nequi o se dejó como saldo a favor.
              </span>
            </span>
          </label>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-lg text-blanco">
              {pesos(totalElegido)}
            </span>
            <button
              type="button"
              onClick={confirmarDevolucion}
              disabled={trabajando || totalElegido === 0 || motivo.trim().length === 0}
              className="bisel-sm h-12 bg-rojo px-6 text-xs font-semibold tracking-[0.16em] text-blanco uppercase disabled:opacity-40"
            >
              {trabajando ? "Registrando…" : "Registrar devolución"}
            </button>
          </div>

          {error ? (
            <p role="alert" className="mt-4 border-l-2 border-rojo bg-rojo/10 px-4 py-3 text-sm">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
