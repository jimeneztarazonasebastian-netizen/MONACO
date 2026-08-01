import type { Metadata } from "next";
import Link from "next/link";

import {
  AbrirTurno,
  CerrarTurno,
  type ResumenTurno,
} from "@/components/admin/TurnoCaja";
import { fechaHora, pesos } from "@/lib/formato";
import { exigirSesion } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Turno de caja" };

export default async function PaginaCaja() {
  await exigirSesion();
  const supabase = await crearClienteServidor();

  const { data: abierta } = await supabase
    .from("cash_sessions")
    .select("id")
    .is("closed_at", null)
    .maybeSingle();

  const { data: resumenCrudo } = abierta
    ? await supabase.rpc("cash_session_summary", { p_session_id: abierta.id })
    : { data: null };

  const resumen = (resumenCrudo as ResumenTurno[] | null)?.[0] ?? null;

  const { data: cerrados } = await supabase
    .from("cash_sessions")
    .select("id, opened_at, closed_at, opening_amount, counted_amount, expected_amount, difference, notes")
    .not("closed_at", "is", null)
    .order("closed_at", { ascending: false })
    .limit(10);

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="fuente-display mb-8 text-2xl">Turno de caja</h1>

      {resumen ? <CerrarTurno resumen={resumen} /> : <AbrirTurno />}

      {cerrados && cerrados.length > 0 ? (
        <section className="mt-12">
          <h2 className="fuente-display mb-5 text-sm">Últimos cierres</h2>
          <ul className="flex flex-col">
            {cerrados.map((turno) => {
              const diferencia = turno.difference ?? 0;
              return (
                <li
                  key={turno.id}
                  className="flex flex-wrap items-baseline justify-between gap-3 border-b border-humo py-4"
                >
                  <span className="text-sm text-gris">
                    {fechaHora(turno.closed_at)}
                  </span>
                  <span className="flex flex-wrap items-baseline gap-5 font-mono text-sm">
                    <span className="text-gris">
                      esperado {pesos(turno.expected_amount)}
                    </span>
                    <span className="text-gris">
                      contado {pesos(turno.counted_amount)}
                    </span>
                    <span
                      className={
                        diferencia === 0
                          ? "text-blanco"
                          : "font-semibold text-rojo"
                      }
                    >
                      {diferencia === 0
                        ? "cuadró"
                        : diferencia > 0
                          ? `sobró ${pesos(diferencia)}`
                          : `faltó ${pesos(Math.abs(diferencia))}`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 text-sm text-gris">
        <Link href="/pos" className="underline transition-colors hover:text-blanco">
          Ir a la caja POS
        </Link>
      </p>
    </section>
  );
}
