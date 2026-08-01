"use client";

import { useActionState } from "react";

import { AreaTexto, Aviso, BotonEnviar, Campo } from "@/components/ui/campos";
import { abrirTurno, cerrarTurno } from "@/lib/actions/caja";
import { ESTADO_INICIAL } from "@/lib/actions/estado";
import { fechaHora, pesos } from "@/lib/formato";

export type ResumenTurno = {
  session_id: string;
  cajero: string | null;
  abierta_desde: string;
  base: number;
  ventas: number;
  total_vendido: number;
  efectivo: number;
  nequi: number;
  daviplata: number;
  bancolombia: number;
  tarjeta: number;
  esperado_en_caja: number;
};

export function AbrirTurno() {
  const [estado, accion] = useActionState(abrirTurno, ESTADO_INICIAL);

  return (
    <form action={accion} className="bisel border border-humo bg-carbon p-6">
      <h2 className="fuente-display mb-2 text-lg">Turno cerrado</h2>
      <p className="mb-6 text-sm leading-relaxed text-gris">
        Cuenta el efectivo con el que arranca la caja y ábrelo. Sin turno
        abierto no se puede vender: es lo que permite saber quién respondía por
        la plata cuando algo no cuadra.
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <Campo
          etiqueta="Base inicial"
          name="base"
          inputMode="numeric"
          placeholder="100000"
          defaultValue={estado.valores?.base ?? ""}
          className="w-48"
          autoFocus
          required
        />
        <BotonEnviar>Abrir turno</BotonEnviar>
      </div>

      <div className="mt-5">
        <Aviso>{estado.error}</Aviso>
      </div>
    </form>
  );
}

function Renglon({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-humo/50 py-3">
      <span className="text-sm text-gris">{etiqueta}</span>
      <span
        className={`font-mono ${destacado ? "text-xl text-blanco" : "text-base text-blanco"}`}
      >
        {valor}
      </span>
    </div>
  );
}

export function CerrarTurno({ resumen }: { resumen: ResumenTurno }) {
  const [estado, accion] = useActionState(cerrarTurno, ESTADO_INICIAL);

  const otros =
    resumen.nequi + resumen.daviplata + resumen.bancolombia + resumen.tarjeta;

  return (
    <div className="flex flex-col gap-8">
      <section className="bisel border border-humo bg-carbon p-6">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="fuente-display text-lg">Turno abierto</h2>
          <p className="text-xs text-gris">
            {resumen.cajero ?? "Sin nombre"} · desde{" "}
            {fechaHora(resumen.abierta_desde)}
          </p>
        </div>

        <Renglon etiqueta="Base inicial" valor={pesos(resumen.base)} />
        <Renglon
          etiqueta={`Ventas del turno (${resumen.ventas})`}
          valor={pesos(resumen.total_vendido)}
        />

        <p className="mt-6 mb-2 text-xs tracking-[0.16em] text-gris uppercase">
          Por método de pago
        </p>
        <Renglon etiqueta="Efectivo" valor={pesos(resumen.efectivo)} />
        {resumen.nequi > 0 ? (
          <Renglon etiqueta="Nequi" valor={pesos(resumen.nequi)} />
        ) : null}
        {resumen.daviplata > 0 ? (
          <Renglon etiqueta="Daviplata" valor={pesos(resumen.daviplata)} />
        ) : null}
        {resumen.bancolombia > 0 ? (
          <Renglon etiqueta="Bancolombia" valor={pesos(resumen.bancolombia)} />
        ) : null}
        {resumen.tarjeta > 0 ? (
          <Renglon etiqueta="Tarjeta" valor={pesos(resumen.tarjeta)} />
        ) : null}

        <div className="mt-6 border-t-2 border-rojo pt-4">
          <Renglon
            etiqueta="Debería haber en el cajón"
            valor={pesos(resumen.esperado_en_caja)}
            destacado
          />
        </div>

        <p className="mt-4 text-xs leading-relaxed text-gris">
          Solo el efectivo se compara contra el conteo físico. Los{" "}
          {pesos(otros)} de Nequi, Daviplata, tarjeta y Bancolombia no pasan por
          el cajón.
        </p>
      </section>

      <form action={accion} className="bisel border border-humo bg-carbon p-6">
        <h2 className="fuente-display mb-2 text-lg">Cerrar el turno</h2>
        <p className="mb-6 text-sm leading-relaxed text-gris">
          Cuenta el efectivo del cajón y escribe cuánto hay. El sistema calcula
          la diferencia y la guarda. No se puede editar después.
        </p>

        <div className="flex flex-wrap items-end gap-4">
          <Campo
            etiqueta="Efectivo contado"
            name="contado"
            inputMode="numeric"
            placeholder="0"
            defaultValue={estado.valores?.contado ?? ""}
            className="w-48"
            required
          />
        </div>

        <div className="mt-4">
          <AreaTexto
            etiqueta="Notas"
            name="notas"
            defaultValue={estado.valores?.notas ?? ""}
            placeholder="Se sacaron 20.000 para el domicilio de la mañana"
          />
        </div>

        <div className="mt-5">
          <Aviso>{estado.error}</Aviso>
        </div>

        <div className="mt-5">
          <BotonEnviar>Cerrar turno</BotonEnviar>
        </div>
      </form>
    </div>
  );
}
