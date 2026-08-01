import { create } from "zustand";

import type { VarianteEncontrada } from "@/lib/actions/ventas";

export type LineaCarrito = {
  variantId: string;
  productName: string;
  size: string;
  color: string;
  sku: string;
  precioLista: number;
  /** Puede ser menor al de lista: el cajero rebaja, nunca sube. */
  precio: number;
  cantidad: number;
  stock: number;
};

type EstadoPos = {
  lineas: LineaCarrito[];
  descuento: number;
  agregar: (v: VarianteEncontrada) => { ok: boolean; error?: string };
  cambiarCantidad: (variantId: string, cantidad: number) => void;
  cambiarPrecio: (variantId: string, precio: number) => void;
  quitar: (variantId: string) => void;
  vaciar: () => void;
  fijarDescuento: (valor: number) => void;
};

/**
 * Carrito del POS, en memoria y a propósito.
 *
 * El del catálogo web sí se guarda en localStorage, porque el cliente
 * puede volver mañana. Este no: si el cajero recarga la pantalla en
 * mitad de una venta, lo que quiere es empezar limpio, no heredar el
 * carrito de un cliente que ya se fue.
 */
export const usarPos = create<EstadoPos>((set, get) => ({
  lineas: [],
  descuento: 0,

  agregar: (v) => {
    const existente = get().lineas.find((l) => l.variantId === v.variant_id);

    if (existente) {
      if (existente.cantidad + 1 > existente.stock) {
        return {
          ok: false,
          error: `Solo quedan ${existente.stock} de ${v.product_name} talla ${v.size}.`,
        };
      }
      set({
        lineas: get().lineas.map((l) =>
          l.variantId === v.variant_id ? { ...l, cantidad: l.cantidad + 1 } : l,
        ),
      });
      return { ok: true };
    }

    if (v.stock < 1) {
      return { ok: false, error: `${v.product_name} talla ${v.size} está agotada.` };
    }

    set({
      lineas: [
        ...get().lineas,
        {
          variantId: v.variant_id,
          productName: v.product_name,
          size: v.size,
          color: v.color,
          sku: v.sku,
          precioLista: v.sale_price,
          precio: v.sale_price,
          cantidad: 1,
          stock: v.stock,
        },
      ],
    });
    return { ok: true };
  },

  cambiarCantidad: (variantId, cantidad) =>
    set({
      lineas: get()
        .lineas.map((l) =>
          l.variantId === variantId
            ? { ...l, cantidad: Math.max(0, Math.min(cantidad, l.stock)) }
            : l,
        )
        .filter((l) => l.cantidad > 0),
    }),

  // Rebajar sí, subir no. La base lo rechazaría igual, pero es mejor
  // que el cajero lo vea aquí que después de haber cobrado.
  cambiarPrecio: (variantId, precio) =>
    set({
      lineas: get().lineas.map((l) =>
        l.variantId === variantId
          ? { ...l, precio: Math.max(0, Math.min(precio, l.precioLista)) }
          : l,
      ),
    }),

  quitar: (variantId) =>
    set({ lineas: get().lineas.filter((l) => l.variantId !== variantId) }),

  vaciar: () => set({ lineas: [], descuento: 0 }),

  fijarDescuento: (valor) => set({ descuento: Math.max(0, valor) }),
}));

export function subtotalCarrito(lineas: LineaCarrito[]): number {
  return lineas.reduce((suma, l) => suma + l.precio * l.cantidad, 0);
}

export function unidadesCarrito(lineas: LineaCarrito[]): number {
  return lineas.reduce((suma, l) => suma + l.cantidad, 0);
}
