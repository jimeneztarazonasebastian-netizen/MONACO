"use server";

import { revalidatePath } from "next/cache";

import type { EstadoFormulario } from "@/lib/actions/estado";
import { exigirSesion } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { aPesos, aTexto } from "@/lib/texto";

/**
 * Abre el turno con la base inicial.
 *
 * Un solo turno abierto a la vez: lo garantiza un índice único en la
 * base, no esta función. Si dos cajeros abren al mismo tiempo, uno de
 * los dos recibe el error y no quedan dos turnos compitiendo por el
 * mismo efectivo.
 */
export async function abrirTurno(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();
  const supabase = await crearClienteServidor();

  const base = aPesos(formData.get("base"));
  const valores = { base: aTexto(formData.get("base")) };

  if (base < 0) return { error: "La base no puede ser negativa.", valores };

  const { error } = await supabase.rpc("open_cash_session", { p_opening: base });

  if (error) {
    if (error.message.includes("Ya hay una caja abierta")) {
      return { error: "Ya hay una caja abierta. Ciérrala antes de abrir otra.", valores };
    }
    return { error: `No se pudo abrir el turno: ${error.message}`, valores };
  }

  revalidatePath("/caja");
  revalidatePath("/pos");
  return { error: null, ok: true };
}

/**
 * Entradas y salidas de efectivo que no son ventas: plata para el
 * domicilio, un gasto, o un cambio que se repone.
 *
 * Sin esto, sacar 20.000 del cajón aparecía como faltante al cierre y se
 * lo cargaba el cajero.
 */
export async function moverEfectivo(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();
  const supabase = await crearClienteServidor();

  const tipo = aTexto(formData.get("tipo"));
  const monto = aPesos(formData.get("monto"));
  const motivo = aTexto(formData.get("motivo"));
  const valores = {
    tipo,
    monto: aTexto(formData.get("monto")),
    motivo,
  };

  if (tipo !== "entrada" && tipo !== "salida") {
    return { error: "Elige si entra o sale plata.", valores };
  }
  if (monto <= 0) return { error: "El monto debe ser mayor que cero.", valores };
  if (!motivo) {
    return { error: "Escribe de dónde sale o a dónde va la plata.", valores };
  }

  const { error } = await supabase.rpc("register_cash_movement", {
    p_tipo: tipo,
    p_monto: monto,
    p_motivo: motivo,
  });

  if (error) {
    if (error.message.includes("solo hay")) return { error: error.message, valores };
    if (error.message.includes("No hay turno abierto")) {
      return { error: "No hay turno abierto. Ábrelo antes de mover efectivo.", valores };
    }
    return { error: `No se pudo registrar: ${error.message}`, valores };
  }

  revalidatePath("/caja");
  return { error: null, ok: true };
}

/**
 * Cierra el turno contra el conteo físico del efectivo.
 *
 * Solo el efectivo cuadra: Nequi, Daviplata, tarjeta y Bancolombia no
 * pasan por el cajón, así que compararlos contra lo contado no tendría
 * sentido. La diferencia queda guardada, sobrante o faltante, y no se
 * puede editar después.
 */
export async function cerrarTurno(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();
  const supabase = await crearClienteServidor();

  const contado = aPesos(formData.get("contado"));
  const notas = aTexto(formData.get("notas"));
  const valores = { contado: aTexto(formData.get("contado")), notas };

  if (!aTexto(formData.get("contado"))) {
    return { error: "Escribe cuánto efectivo contaste.", valores };
  }

  const { error } = await supabase.rpc("close_cash_session", {
    p_counted: contado,
    p_notes: notas || undefined,
  });

  if (error) {
    if (error.message.includes("No hay caja abierta")) {
      return { error: "No hay ningún turno abierto.", valores };
    }
    return { error: `No se pudo cerrar el turno: ${error.message}`, valores };
  }

  revalidatePath("/caja");
  revalidatePath("/pos");
  return { error: null, ok: true };
}
