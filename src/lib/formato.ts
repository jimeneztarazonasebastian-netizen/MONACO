/**
 * Formato colombiano. Todo lo que se muestre al usuario pasa por aquí:
 * si un precio aparece con decimales o una fecha en horario de otro
 * país, es porque alguien se saltó este archivo.
 */

const ZONA_HORARIA = "America/Bogota";

const formateadorPesos = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const formateadorNumero = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
});

/** 89900 → "$ 89.900" */
export function pesos(valor: number | string | null | undefined): string {
  const numero = aNumero(valor);
  return formateadorPesos.format(numero);
}

/** 89900 → "89.900" (sin símbolo, para inputs y tirillas) */
export function numero(valor: number | string | null | undefined): string {
  return formateadorNumero.format(aNumero(valor));
}

/**
 * La base entrega `numeric(12,2)` como string para no perder precisión.
 * Aquí se convierte una sola vez, en el borde de presentación.
 */
export function aNumero(valor: number | string | null | undefined): number {
  if (valor === null || valor === undefined || valor === "") return 0;
  const numero = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

/** "2026-08-01T14:30:00Z" → "1 ago 2026, 9:30 a. m." */
export function fechaHora(valor: string | Date | null | undefined): string {
  const fecha = aFecha(valor);
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: ZONA_HORARIA,
  }).format(fecha);
}

/** "2026-08-01T14:30:00Z" → "1 ago 2026" */
export function fecha(valor: string | Date | null | undefined): string {
  const fecha = aFecha(valor);
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: ZONA_HORARIA,
  }).format(fecha);
}

/** "14:30" en hora de Bogotá */
export function hora(valor: string | Date | null | undefined): string {
  const fecha = aFecha(valor);
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    timeStyle: "short",
    timeZone: ZONA_HORARIA,
  }).format(fecha);
}

function aFecha(valor: string | Date | null | undefined): Date | null {
  if (!valor) return null;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}
