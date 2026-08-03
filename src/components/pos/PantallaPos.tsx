"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { FilaPago, PanelCobro } from "@/components/pos/PanelCobro";
import {
  Tirilla,
  type DatosTienda,
  type TirillaVenta,
} from "@/components/pos/Tirilla";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { pesos } from "@/lib/formato";
import {
  buscarPorCodigo,
  buscarPorNombre,
  registrarVenta,
  type VarianteEncontrada,
} from "@/lib/actions/ventas";
import { subtotalCarrito, unidadesCarrito, usarPos } from "@/store/pos";

type Pantalla = "vendiendo" | "cobrando" | "hecha";

export function PantallaPos({
  tienda,
  cajero,
}: {
  tienda: DatosTienda;
  cajero: string;
}) {
  const { lineas, descuento, agregar, cambiarCantidad, quitar, vaciar } = usarPos();

  const [pantalla, setPantalla] = useState<Pantalla>("vendiendo");
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<VarianteEncontrada[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorCobro, setErrorCobro] = useState<string | null>(null);
  const [ultimaVenta, setUltimaVenta] = useState<TirillaVenta | null>(null);

  const campoBusqueda = useRef<HTMLInputElement>(null);

  const subtotal = subtotalCarrito(lineas);
  const total = Math.max(0, subtotal - descuento);
  const unidades = unidadesCarrito(lineas);

  const meter = useCallback(
    (v: VarianteEncontrada) => {
      const r = agregar(v);
      setAviso(r.ok ? null : (r.error ?? null));
    },
    [agregar],
  );

  // El lector escribe en cualquier parte de la pantalla, así que se
  // escucha en la ventana y no en un input concreto. Se apaga mientras
  // se cobra para que un escaneo accidental no meta prendas a una venta
  // que ya está cerrándose.
  const alEscanear = useCallback(
    async (codigo: string) => {
      if (pantalla !== "vendiendo") return;
      const { variante, error } = await buscarPorCodigo(codigo);
      if (error || !variante) {
        setAviso(error ?? "Código no encontrado.");
        return;
      }
      meter(variante);
    },
    [meter, pantalla],
  );

  useBarcodeScanner(alEscanear, pantalla === "vendiendo");

  // Búsqueda por nombre, con un respiro para no consultar en cada tecla.
  useEffect(() => {
    if (busqueda.trim().length < 2) {
      setResultados([]);
      return;
    }
    const id = setTimeout(async () => {
      setResultados(await buscarPorNombre(busqueda));
    }, 250);
    return () => clearTimeout(id);
  }, [busqueda]);

  async function cobrar(pagos: FilaPago[], recibido: number | null) {
    setProcesando(true);
    setErrorCobro(null);

    const efectivo = pagos
      .filter((p) => p.metodo === "efectivo")
      .reduce((s, p) => s + p.monto, 0);
    const devuelta = recibido !== null ? recibido - efectivo : null;

    const resultado = await registrarVenta(
      lineas.map((l) => ({
        variant_id: l.variantId,
        quantity: l.cantidad,
        unit_price: l.precio,
        discount: 0,
      })),
      pagos.map((p) => ({
        method: p.metodo,
        amount: p.monto,
        received: p.metodo === "efectivo" && recibido !== null ? recibido : undefined,
        change_due:
          p.metodo === "efectivo" && devuelta !== null ? devuelta : undefined,
      })),
      descuento,
      null,
    );

    setProcesando(false);

    if (!resultado.ok) {
      setErrorCobro(resultado.error);
      return;
    }

    setUltimaVenta({
      numero: resultado.numero,
      fecha: new Date().toISOString(),
      cajero,
      lineas: [...lineas],
      descuento,
      total,
      pagos: pagos.map((p) => ({ metodo: p.metodo, monto: p.monto })),
      recibido,
      devuelta,
    });
    vaciar();
    setPantalla("hecha");
  }

  function nuevaVenta() {
    setUltimaVenta(null);
    setAviso(null);
    setBusqueda("");
    setResultados([]);
    setPantalla("vendiendo");
    campoBusqueda.current?.focus();
  }

  // --- Venta registrada -------------------------------------------------
  if (pantalla === "hecha" && ultimaVenta) {
    return (
      <>
        <Tirilla venta={ultimaVenta} tienda={tienda} />
        <section className="mx-auto max-w-lg px-6 py-16 text-center print:hidden">
          <p className="mb-2 text-xs tracking-[0.18em] text-gris uppercase">
            Venta registrada
          </p>
          <p className="fuente-display mb-8 text-4xl">{ultimaVenta.numero}</p>

          <p className="mb-2 font-mono text-2xl">{pesos(ultimaVenta.total)}</p>
          {ultimaVenta.devuelta !== null && ultimaVenta.devuelta > 0 ? (
            <p className="mb-8 font-mono text-lg text-rojo">
              Cambio {pesos(ultimaVenta.devuelta)}
            </p>
          ) : (
            <div className="mb-8" />
          )}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="bisel-sm h-16 bg-rojo px-8 text-sm font-semibold tracking-[0.2em] text-blanco uppercase"
            >
              Imprimir tirilla
            </button>
            <button
              type="button"
              onClick={nuevaVenta}
              autoFocus
              className="bisel-sm h-16 border border-humo px-8 text-sm tracking-[0.2em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
            >
              Nueva venta
            </button>
          </div>
        </section>
      </>
    );
  }

  // --- Cobro ------------------------------------------------------------
  if (pantalla === "cobrando") {
    return (
      <section className="mx-auto max-w-xl px-6 py-10">
        <PanelCobro
          total={total}
          procesando={procesando}
          error={errorCobro}
          onCobrar={cobrar}
          onCancelar={() => {
            setErrorCobro(null);
            setPantalla("vendiendo");
          }}
        />
      </section>
    );
  }

  // --- Vendiendo --------------------------------------------------------
  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_420px]">
      <div className="flex flex-col gap-4">
        <input
          ref={campoBusqueda}
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Escanea la prenda o escribe su nombre…"
          autoFocus
          className="h-16 w-full border border-humo bg-carbon px-4 text-lg text-blanco placeholder:text-gris focus:border-gris focus:outline-none"
        />

        {aviso ? (
          <p
            role="alert"
            className="border-l-2 border-rojo bg-rojo/10 px-4 py-3 text-sm"
          >
            {aviso}
          </p>
        ) : null}

        {resultados.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {resultados.map((v) => (
              <li key={v.variant_id}>
                <button
                  type="button"
                  onClick={() => meter(v)}
                  disabled={v.stock < 1}
                  className="bisel-sm flex w-full items-center justify-between gap-3 border border-humo bg-carbon p-4 text-left transition-colors hover:border-gris disabled:opacity-40"
                >
                  <span>
                    <span className="block text-sm text-blanco">
                      {v.product_name}
                    </span>
                    <span className="block font-mono text-xs text-gris">
                      {v.size} · {v.color} · {v.stock} en bodega
                    </span>
                  </span>
                  <span className="font-mono text-base text-blanco">
                    {pesos(v.sale_price)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {resultados.length === 0 && busqueda.trim().length >= 2 ? (
          <p className="text-sm text-gris">Nada coincide con esa búsqueda.</p>
        ) : null}
      </div>

      {/* Carrito */}
      <div className="flex flex-col gap-4 border-t border-humo pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
        {lineas.length === 0 ? (
          <p className="py-10 text-center text-sm text-gris">
            Escanea el código de la prenda para empezar.
          </p>
        ) : (
          <ul className="flex flex-col">
            {lineas.map((l) => (
              <li key={l.variantId} className="border-b border-humo py-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-sm text-blanco">
                      {l.productName}
                    </span>
                    <span className="block font-mono text-xs text-gris">
                      {l.size} · {l.color}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => quitar(l.variantId)}
                    aria-label={`Quitar ${l.productName} ${l.size}`}
                    className="px-2 text-gris transition-colors hover:text-rojo"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(l.variantId, l.cantidad - 1)}
                      aria-label="Quitar una unidad"
                      className="h-11 w-11 border border-humo text-lg text-blanco transition-colors hover:border-gris"
                    >
                      −
                    </button>
                    <span className="w-12 text-center font-mono text-lg text-blanco">
                      {l.cantidad}
                    </span>
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(l.variantId, l.cantidad + 1)}
                      disabled={l.cantidad >= l.stock}
                      aria-label="Agregar una unidad"
                      className="h-11 w-11 border border-humo text-lg text-blanco transition-colors hover:border-gris disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-mono text-base text-blanco">
                    {pesos(l.precio * l.cantidad)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex flex-col gap-4 pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm tracking-[0.16em] text-gris uppercase">
              Total
            </span>
            <span className="fuente-display text-3xl text-blanco">
              {pesos(total)}
            </span>
          </div>

          {unidades > 0 ? (
            <p className="text-right font-mono text-xs text-gris">
              {unidades} {unidades === 1 ? "unidad" : "unidades"}
            </p>
          ) : null}

          <button
            type="button"
            disabled={lineas.length === 0}
            onClick={() => setPantalla("cobrando")}
            className="bisel-sm h-16 bg-rojo px-8 text-sm font-semibold tracking-[0.2em] text-blanco uppercase transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            Cobrar
          </button>

          {lineas.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                vaciar();
                setAviso(null);
              }}
              className="text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:text-rojo"
            >
              Vaciar el carrito
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
