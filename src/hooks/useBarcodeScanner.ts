"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Lector de código de barras sin librería.
 *
 * El lector se comporta como un teclado: escribe los dígitos muy rápido
 * y manda Enter. Un humano tecleando nunca baja de unos 50 ms entre
 * teclas; el lector va muy por debajo. Con ese umbral se distingue una
 * cosa de la otra y se evita que lo que el cajero escribe a mano en el
 * buscador se interprete como un escaneo.
 *
 * Escucha en toda la ventana, no en un input: así funciona aunque el
 * foco se haya ido a un botón o a un modal, que es lo que pasa siempre
 * en una caja de verdad.
 */
const MS_ENTRE_TECLAS_LECTOR = 30;
const LARGO_MINIMO = 6;

export function useBarcodeScanner(
  alEscanear: (codigo: string) => void,
  activo = true,
) {
  const buffer = useRef("");
  const ultimaTecla = useRef(0);
  const callback = useRef(alEscanear);

  // Se guarda en una ref para no reinstalar el listener en cada render.
  useEffect(() => {
    callback.current = alEscanear;
  }, [alEscanear]);

  const manejar = useCallback((evento: KeyboardEvent) => {
    const ahora = Date.now();
    const desdeLaUltima = ahora - ultimaTecla.current;
    ultimaTecla.current = ahora;

    if (evento.key === "Enter") {
      const codigo = buffer.current;
      buffer.current = "";
      if (codigo.length >= LARGO_MINIMO) {
        evento.preventDefault();
        callback.current(codigo);
      }
      return;
    }

    // Una pausa larga significa que empieza una lectura nueva.
    if (desdeLaUltima > MS_ENTRE_TECLAS_LECTOR) {
      buffer.current = "";
    }

    // Solo caracteres sueltos: se ignoran Shift, Tab, las flechas.
    if (evento.key.length === 1) {
      buffer.current += evento.key;
    }
  }, []);

  useEffect(() => {
    if (!activo) return;
    window.addEventListener("keydown", manejar);
    return () => window.removeEventListener("keydown", manejar);
  }, [activo, manejar]);
}
