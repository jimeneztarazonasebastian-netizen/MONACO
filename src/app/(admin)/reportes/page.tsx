import type { Metadata } from "next";
import Link from "next/link";

import { fecha as formatoFecha, pesos } from "@/lib/formato";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import * as reportes from "@/lib/reportes";
import { plural } from "@/lib/texto";

export const metadata: Metadata = { title: "Reportes" };

const NOMBRE_METODO: Record<string, string> = {
  efectivo: "Efectivo",
  nequi: "Nequi",
  daviplata: "Daviplata",
  bancolombia: "Bancolombia",
  tarjeta: "Tarjeta",
};

/** Fecha de hoy en Bogotá, como YYYY-MM-DD. */
function hoyEnBogota(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
  }).format(new Date());
}

function hace(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(d);
}

const RANGOS = [
  { clave: "hoy", etiqueta: "Hoy", dias: 0 },
  { clave: "7", etiqueta: "7 días", dias: 6 },
  { clave: "30", etiqueta: "30 días", dias: 29 },
  { clave: "90", etiqueta: "90 días", dias: 89 },
] as const;

function esFecha(valor: string | undefined): valor is string {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function Tarjeta({
  etiqueta,
  valor,
  detalle,
  acento = false,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  acento?: boolean;
}) {
  return (
    <div
      className={`bisel border bg-carbon p-5 ${acento ? "border-rojo" : "border-humo"}`}
    >
      <p className="mb-2 text-xs tracking-[0.16em] text-gris uppercase">
        {etiqueta}
      </p>
      <p className="fuente-display text-2xl text-blanco">{valor}</p>
      {detalle ? <p className="mt-2 text-xs text-gris">{detalle}</p> : null}
    </div>
  );
}

export default async function PaginaReportes({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string; desde?: string; hasta?: string }>;
}) {
  await exigirAdmin();
  const { rango, desde, hasta } = await searchParams;
  const supabase = await crearClienteServidor();

  // Un rango escrito a mano manda; si no, el atajo elegido; si no, 30 días.
  const preset = RANGOS.find((r) => r.clave === rango) ?? RANGOS[2];
  const pDesde = esFecha(desde) ? desde : hace(preset.dias);
  const pHasta = esFecha(hasta) ? hasta : hoyEnBogota();

  const rangoLibre = esFecha(desde) || esFecha(hasta);

  const periodo = { p_desde: pDesde, p_hasta: pHasta };

  const [general, porDia, porMetodo, top] = await Promise.all([
    supabase.rpc("reporte_resumen", periodo),
    supabase.rpc("reporte_por_dia", periodo),
    supabase.rpc("reporte_por_metodo", periodo),
    supabase.rpc("reporte_top_prendas", { ...periodo, p_limite: 15 }),
  ]);

  const resumen: reportes.Resumen | null = general.data?.[0] ?? null;
  const error = general.error?.message ?? null;
  const dias = { filas: (porDia.data ?? []) as reportes.PorDia[] };
  const metodos = { filas: (porMetodo.data ?? []) as reportes.PorMetodo[] };
  const prendas = { filas: (top.data ?? []) as reportes.TopPrenda[] };

  const margenPorcentaje =
    resumen && resumen.ingresos > 0
      ? Math.round((resumen.margen / resumen.ingresos) * 100)
      : 0;

  const maxIngreso = Math.max(1, ...dias.filas.map((d) => d.ingresos));
  const totalMetodos = metodos.filas.reduce((s, m) => s + m.total, 0);

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="fuente-display mb-6 text-2xl">Reportes</h1>

      <div className="mb-8 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {RANGOS.map((r) => (
            <Link
              key={r.clave}
              href={`/reportes?rango=${r.clave}`}
              className={`px-4 py-2 text-xs tracking-[0.14em] uppercase transition-colors ${
                !rangoLibre && preset.clave === r.clave
                  ? "bg-humo text-blanco"
                  : "text-gris hover:text-blanco"
              }`}
            >
              {r.etiqueta}
            </Link>
          ))}
        </div>

        <form className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-2">
            <span className="text-xs tracking-[0.16em] text-gris uppercase">
              Desde
            </span>
            <input
              type="date"
              name="desde"
              defaultValue={pDesde}
              className="h-12 border border-humo bg-carbon px-3 font-mono text-sm text-blanco focus:border-gris focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs tracking-[0.16em] text-gris uppercase">
              Hasta
            </span>
            <input
              type="date"
              name="hasta"
              defaultValue={pHasta}
              className="h-12 border border-humo bg-carbon px-3 font-mono text-sm text-blanco focus:border-gris focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="bisel-sm h-12 border border-humo px-6 text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
          >
            Ver
          </button>
        </form>

        <p className="font-mono text-xs text-gris">
          {formatoFecha(pDesde)} — {formatoFecha(pHasta)}
        </p>
      </div>

      {error ? (
        <p className="border-l-2 border-rojo bg-rojo/10 px-4 py-3 text-sm">
          No se pudo cargar el reporte: {error}
        </p>
      ) : null}

      {resumen && resumen.ventas === 0 ? (
        <p className="text-sm text-gris">
          No hay ventas pagadas en este período. Los reportes solo cuentan
          ventas pagadas: las pendientes del catálogo y las anuladas quedan
          fuera.
        </p>
      ) : null}

      {resumen && resumen.ventas > 0 ? (
        <>
          <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tarjeta
              etiqueta="Vendido"
              valor={pesos(resumen.ingresos)}
              detalle={`${plural(resumen.ventas, "venta", "ventas")} · ${plural(resumen.unidades, "unidad", "unidades")}`}
            />
            <Tarjeta
              etiqueta="Costo de lo vendido"
              valor={pesos(resumen.costo)}
              detalle="Lo que te costó la mercancía"
            />
            <Tarjeta
              etiqueta="Margen"
              valor={pesos(resumen.margen)}
              detalle={`${margenPorcentaje}% de lo vendido`}
              acento
            />
            <Tarjeta
              etiqueta="Ticket promedio"
              valor={pesos(resumen.ticket_promedio)}
              detalle={
                resumen.descuentos > 0
                  ? `${pesos(resumen.descuentos)} en descuentos`
                  : "Sin descuentos"
              }
            />
          </div>

          {metodos.filas.length > 0 ? (
            <section className="mb-12">
              <h2 className="fuente-display mb-5 text-sm">Cómo te pagaron</h2>
              <ul className="flex flex-col">
                {metodos.filas.map((m) => {
                  const porcentaje = Math.round((m.total / totalMetodos) * 100);
                  return (
                    <li key={m.metodo} className="border-b border-humo py-4">
                      <div className="mb-2 flex items-baseline justify-between gap-3">
                        <span className="text-sm text-blanco">
                          {NOMBRE_METODO[m.metodo] ?? m.metodo}
                          <span className="ml-3 text-xs text-gris">
                            {plural(m.cobros, "cobro", "cobros")}
                          </span>
                        </span>
                        <span className="font-mono text-sm text-blanco">
                          {pesos(m.total)}
                          <span className="ml-3 text-gris">{porcentaje}%</span>
                        </span>
                      </div>
                      <div
                        className="h-1 bg-rojo"
                        style={{ width: `${Math.max(porcentaje, 1)}%` }}
                        aria-hidden="true"
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {dias.filas.length > 0 ? (
            <section className="mb-12">
              <h2 className="fuente-display mb-5 text-sm">Día por día</h2>
              <ul className="flex flex-col">
                {dias.filas.map((d) => (
                  <li
                    key={d.dia}
                    className="flex flex-wrap items-center gap-4 border-b border-humo py-3"
                  >
                    <span className="w-32 font-mono text-xs text-gris">
                      {formatoFecha(d.dia)}
                    </span>
                    <span className="w-24 font-mono text-xs text-gris">
                      {plural(d.ventas, "venta", "ventas")}
                    </span>
                    <span className="min-w-24 flex-1">
                      <span
                        className="block h-2 bg-humo"
                        style={{
                          width: `${Math.round((d.ingresos / maxIngreso) * 100)}%`,
                        }}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="w-28 text-right font-mono text-sm text-blanco">
                      {pesos(d.ingresos)}
                    </span>
                    <span className="w-28 text-right font-mono text-xs text-gris">
                      margen {pesos(d.margen)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {prendas.filas.length > 0 ? (
            <section>
              <h2 className="fuente-display mb-5 text-sm">Lo que más sale</h2>
              <ul className="flex flex-col">
                {prendas.filas.map((p, i) => (
                  <li
                    key={`${p.producto}-${p.talla}-${p.color}-${i}`}
                    className="flex flex-wrap items-center justify-between gap-4 border-b border-humo py-3"
                  >
                    <span className="min-w-48 flex-1">
                      <span className="block text-sm text-blanco">
                        {p.producto}
                      </span>
                      <span className="block font-mono text-xs text-gris">
                        {p.talla} · {p.color}
                      </span>
                    </span>
                    <span className="font-mono text-sm text-blanco">
                      {plural(p.unidades, "unidad", "unidades")}
                    </span>
                    <span className="w-28 text-right font-mono text-sm text-blanco">
                      {pesos(p.ingresos)}
                    </span>
                    <span className="w-28 text-right font-mono text-xs text-gris">
                      margen {pesos(p.margen)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      <p className="mt-12 text-xs leading-relaxed text-gris">
        El stock bajo y la cola de etiquetas viven en{" "}
        <Link href="/inventario" className="underline hover:text-blanco">
          Inventario
        </Link>
        . El arqueo de cada turno, en{" "}
        <Link href="/caja" className="underline hover:text-blanco">
          Turno
        </Link>
        .
      </p>
    </section>
  );
}
