import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LineaCarritoWeb = {
  variantId: string;
  slug: string;
  productName: string;
  size: string;
  color: string;
  precio: number;
  cantidad: number;
  imagen: string | null;
  stock: number;
};

type EstadoCarrito = {
  lineas: LineaCarritoWeb[];
  agregar: (linea: Omit<LineaCarritoWeb, "cantidad">, cantidad?: number) => void;
  cambiarCantidad: (variantId: string, cantidad: number) => void;
  quitar: (variantId: string) => void;
  vaciar: () => void;
  /** Reconcilia el carrito guardado contra lo que hay hoy en la tienda. */
  sincronizar: (estado: Record<string, { precio: number; stock: number } | null>) => {
    retiradas: string[];
    ajustadas: string[];
  };
};

/**
 * Carrito del catálogo web.
 *
 * Al revés que el del POS, este sí se guarda en localStorage: el cliente
 * arma su pedido desde el celular, se distrae, vuelve mañana y espera
 * encontrarlo. El stock que se guarda aquí es el del momento en que
 * agregó la prenda y puede quedar viejo; la verdad la dice
 * `create_web_order` al confirmar, no esta copia.
 */
export const usarCarrito = create<EstadoCarrito>()(
  persist(
    (set, get) => ({
      lineas: [],

      agregar: (linea, cantidad = 1) => {
        const existente = get().lineas.find((l) => l.variantId === linea.variantId);

        if (existente) {
          set({
            lineas: get().lineas.map((l) =>
              l.variantId === linea.variantId
                ? { ...l, cantidad: Math.min(l.cantidad + cantidad, l.stock) }
                : l,
            ),
          });
          return;
        }

        set({
          lineas: [
            ...get().lineas,
            { ...linea, cantidad: Math.min(cantidad, linea.stock) },
          ],
        });
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

      quitar: (variantId) =>
        set({ lineas: get().lineas.filter((l) => l.variantId !== variantId) }),

      vaciar: () => set({ lineas: [] }),

      sincronizar: (estado) => {
        const retiradas: string[] = [];
        const ajustadas: string[] = [];

        const lineas = get()
          .lineas.map((l) => {
            const actual = estado[l.variantId];
            const nombre = `${l.productName} ${l.size}`;

            // Desapareció del catálogo o se quedó sin una sola unidad.
            if (!actual || actual.stock <= 0) {
              retiradas.push(nombre);
              return null;
            }

            const cantidad = Math.min(l.cantidad, actual.stock);
            if (cantidad !== l.cantidad || actual.precio !== l.precio) {
              ajustadas.push(nombre);
            }

            return { ...l, precio: actual.precio, stock: actual.stock, cantidad };
          })
          .filter((l): l is NonNullable<typeof l> => l !== null);

        set({ lineas });
        return { retiradas, ajustadas };
      },
    }),
    { name: "monaco-carrito" },
  ),
);

export function totalCarrito(lineas: LineaCarritoWeb[]): number {
  return lineas.reduce((suma, l) => suma + l.precio * l.cantidad, 0);
}

export function unidadesCarritoWeb(lineas: LineaCarritoWeb[]): number {
  return lineas.reduce((suma, l) => suma + l.cantidad, 0);
}
