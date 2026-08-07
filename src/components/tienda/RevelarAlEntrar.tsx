"use client";

import { useEffect } from "react";

/**
 * Aparición progresiva de los bloques marcados con `.revelar`.
 *
 * El estado escondido lo pone el CSS sólo cuando este script ya está
 * corriendo (`data-animar` en el <html>). Si no hay JavaScript, o el
 * navegador no trae IntersectionObserver, o el visitante pidió menos
 * movimiento, no se esconde nada y el catálogo se ve completo. Un
 * catálogo invisible por culpa de una animación es una tienda cerrada.
 */
export function RevelarAlEntrar() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const raiz = document.documentElement;
    raiz.dataset.animar = "si";

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          entrada.target.classList.add("revelada");
          observador.unobserve(entrada.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    const observarPendientes = () => {
      const pendientes = document.querySelectorAll(
        ".revelar:not(.revelada), .revelar-lado:not(.revelada)",
      );
      for (const nodo of pendientes) {
        observador.observe(nodo);
      }
    };

    observarPendientes();

    // El catálogo cambia sin recargar: los filtros de categoría, talla y
    // orden reemplazan la rejilla entera. Sin volver a observar, las
    // tarjetas que llegan después nacen escondidas y ya no se revelan
    // nunca — el filtro parecería no devolver resultados.
    const cambios = new MutationObserver(observarPendientes);
    cambios.observe(document.body, { childList: true, subtree: true });

    return () => {
      observador.disconnect();
      cambios.disconnect();
      delete raiz.dataset.animar;
    };
  }, []);

  return null;
}
