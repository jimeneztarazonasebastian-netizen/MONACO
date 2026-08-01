import type { LineaCarritoWeb } from "@/store/carrito";

/**
 * Todo lo de WhatsApp vive aquí, aislado a propósito.
 *
 * Hoy el checkout arma un enlace `wa.me`, que es lo que se puede hacer
 * sin RUT ni cuenta de empresa. Cuando el negocio pase a la API oficial
 * de Meta se cambia este archivo y el carrito no se entera.
 */

const INDICATIVO_COLOMBIA = "57";

/**
 * wa.me exige el número en formato internacional, solo dígitos.
 * "300 123 4567", "+57 300 1234567" y "3001234567" tienen que terminar
 * todos en 573001234567.
 */
export function normalizarNumero(numero: string | null | undefined): string | null {
  if (!numero) return null;

  const digitos = numero.replace(/\D/g, "");
  if (digitos.length === 0) return null;

  // Celular colombiano suelto: 10 dígitos empezando por 3.
  if (digitos.length === 10 && digitos.startsWith("3")) {
    return INDICATIVO_COLOMBIA + digitos;
  }
  // Ya trae indicativo.
  if (digitos.length === 12 && digitos.startsWith(INDICATIVO_COLOMBIA)) {
    return digitos;
  }
  // Cualquier otro país o formato: se respeta tal cual.
  return digitos;
}

export function esNumeroValido(numero: string | null | undefined): boolean {
  const limpio = normalizarNumero(numero);
  return limpio !== null && limpio.length >= 10;
}

export function mensajePedido(
  numeroPedido: string,
  lineas: LineaCarritoWeb[],
  total: number,
  cliente: { nombre: string; direccion?: string },
): string {
  const formato = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
  const peso = (n: number) => `$${formato.format(n)}`;

  const renglones = lineas.map(
    (l) =>
      `• ${l.cantidad} x ${l.productName} (${l.size}/${l.color}) — ${peso(l.precio * l.cantidad)}`,
  );

  // Se arma por bloques y se descartan los vacíos. Intercalar líneas en
  // blanco a mano deja huecos dobles en cuanto un bloque falta, y esto
  // es un mensaje que le llega a un cliente de verdad.
  const datos = [
    `Nombre: ${cliente.nombre}`,
    cliente.direccion ? `Dirección: ${cliente.direccion}` : null,
  ].filter((l) => l !== null);

  return [
    `Hola, quiero confirmar mi pedido ${numeroPedido}`,
    renglones.join("\n"),
    `Total: ${peso(total)}`,
    datos.join("\n"),
  ]
    .filter((bloque) => bloque.length > 0)
    .join("\n\n");
}

export function enlaceWhatsapp(numeroTienda: string, mensaje: string): string {
  const destino = normalizarNumero(numeroTienda);
  return `https://wa.me/${destino}?text=${encodeURIComponent(mensaje)}`;
}
