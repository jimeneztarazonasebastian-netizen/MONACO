import type { Metadata } from "next";
import Link from "next/link";

import { fechaHora, pesos } from "@/lib/formato";
import { exigirSesion } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { plural } from "@/lib/texto";
import type { CanalVenta, EstadoVenta } from "@/types/database";

export const metadata: Metadata = { title: "Ventas" };

const CANALES = [
  { clave: "todos", etiqueta: "Todas" },
  { clave: "pos", etiqueta: "Mostrador" },
  { clave: "web", etiqueta: "Catálogo" },
] as const;

const ESTADOS = [
  { clave: "todos", etiqueta: "Todos" },
  { clave: "pagada", etiqueta: "Pagadas" },
  { clave: "pendiente", etiqueta: "Pendientes" },
  { clave: "anulada", etiqueta: "Anuladas" },
] as const;

function comoCanal(valor: string | undefined): CanalVenta | null {
  return valor === "pos" || valor === "web" ? valor : null;
}

function comoEstado(valor: string | undefined): EstadoVenta | null {
  return valor === "pagada" || valor === "pendiente" || valor === "anulada"
    ? valor
    : null;
}

const COLOR_ESTADO: Record<string, string> = {
  pagada: "text-blanco",
  pendiente: "text-gris",
  anulada: "text-rojo line-through",
};

export default async function PaginaVentas({
  searchParams,
}: {
  searchParams: Promise<{ canal?: string; estado?: string; q?: string }>;
}) {
  await exigirSesion();
  const { canal, estado, q } = await searchParams;
  const supabase = await crearClienteServidor();

  let consulta = supabase
    .from("sales")
    .select(
      "id, number, channel, status, total, created_at, profiles(full_name), customers(full_name), sale_items(quantity)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  // Lo que llega por la URL lo escribe cualquiera. Se comprueba contra
  // los valores del enum antes de tocar la base, en vez de confiar en
  // que el enlace lo generó esta misma página.
  const canalFiltro = comoCanal(canal);
  const estadoFiltro = comoEstado(estado);

  if (canalFiltro) consulta = consulta.eq("channel", canalFiltro);
  if (estadoFiltro) consulta = consulta.eq("status", estadoFiltro);
  if (q) consulta = consulta.ilike("number", `%${q}%`);

  const { data: ventas, error } = await consulta;

  const enlace = (cambios: Record<string, string | undefined>) => {
    const parametros = new URLSearchParams();
    for (const [clave, valor] of Object.entries({ canal, estado, q, ...cambios })) {
      if (valor && valor !== "todos") parametros.set(clave, valor);
    }
    const cadena = parametros.toString();
    return cadena ? `/ventas?${cadena}` : "/ventas";
  };

  const total = (ventas ?? [])
    .filter((v) => v.status === "pagada")
    .reduce((suma, v) => suma + v.total, 0);

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="fuente-display mb-8 text-2xl">Ventas</h1>

      <div className="mb-8 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs tracking-[0.16em] text-gris uppercase">
            Canal
          </span>
          {CANALES.map((c) => (
            <Link
              key={c.clave}
              href={enlace({ canal: c.clave })}
              className={`px-4 py-2 text-xs tracking-[0.14em] uppercase transition-colors ${
                (canal ?? "todos") === c.clave
                  ? "bg-humo text-blanco"
                  : "text-gris hover:text-blanco"
              }`}
            >
              {c.etiqueta}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs tracking-[0.16em] text-gris uppercase">
            Estado
          </span>
          {ESTADOS.map((e) => (
            <Link
              key={e.clave}
              href={enlace({ estado: e.clave })}
              className={`px-4 py-2 text-xs tracking-[0.14em] uppercase transition-colors ${
                (estado ?? "todos") === e.clave
                  ? "bg-humo text-blanco"
                  : "text-gris hover:text-blanco"
              }`}
            >
              {e.etiqueta}
            </Link>
          ))}
        </div>

        <form className="flex flex-wrap gap-3">
          {canal ? <input type="hidden" name="canal" value={canal} /> : null}
          {estado ? <input type="hidden" name="estado" value={estado} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por número, MN-000012…"
            className="h-12 min-w-56 flex-1 border border-humo bg-carbon px-4 text-base text-blanco placeholder:text-gris focus:border-gris focus:outline-none"
          />
          <button
            type="submit"
            className="bisel-sm h-12 border border-humo px-6 text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
          >
            Buscar
          </button>
        </form>
      </div>

      {error ? (
        <p className="border-l-2 border-rojo bg-rojo/10 px-4 py-3 text-sm">
          No se pudo cargar el historial: {error.message}
        </p>
      ) : null}

      {ventas && ventas.length > 0 ? (
        <>
          <p className="mb-6 font-mono text-xs text-gris">
            {plural(ventas.length, "venta", "ventas")} · pagadas {pesos(total)}
          </p>

          <ul className="flex flex-col">
            {ventas.map((venta) => {
              const cajero = (venta.profiles as unknown as { full_name: string } | null)
                ?.full_name;
              const cliente = (
                venta.customers as unknown as { full_name: string } | null
              )?.full_name;
              const unidades = (venta.sale_items ?? []).reduce(
                (s, i) => s + i.quantity,
                0,
              );

              return (
                <li key={venta.id}>
                  <Link
                    href={`/ventas/${venta.id}`}
                    className="flex flex-wrap items-center justify-between gap-4 border-b border-humo py-4 transition-colors hover:bg-carbon"
                  >
                    <span className="min-w-40">
                      <span className="block font-mono text-sm text-blanco">
                        {venta.number}
                      </span>
                      <span className="block text-xs text-gris">
                        {fechaHora(venta.created_at)}
                      </span>
                    </span>

                    <span className="min-w-32 flex-1 text-xs text-gris">
                      {venta.channel === "web" ? "Catálogo" : "Mostrador"}
                      {cliente ? ` · ${cliente}` : ""}
                      {cajero ? ` · ${cajero}` : ""}
                    </span>

                    <span className="font-mono text-xs text-gris">
                      {plural(unidades, "unidad", "unidades")}
                    </span>

                    <span
                      className={`w-32 text-right font-mono text-base ${COLOR_ESTADO[venta.status] ?? "text-blanco"}`}
                    >
                      {pesos(venta.total)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      ) : !error ? (
        <p className="text-sm text-gris">
          {q || canal || estado
            ? "Ninguna venta coincide con esos filtros."
            : "Todavía no hay ventas registradas."}
        </p>
      ) : null}
    </section>
  );
}
