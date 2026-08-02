"use client";

import { useEffect } from "react";

const PULSABLE = 'a, button, [role="button"], summary, label';
const CAMPO = "input, textarea, select";

/**
 * Cursor propio de la tienda. No pinta nada en el servidor: crea los dos
 * elementos a mano en el montaje, así no hay desajuste de hidratación ni
 * marcado inútil para quien nunca lo va a ver.
 *
 * Se apaga entero si el puntero no es fino (celular, tablet), que es de
 * donde llega la mayor parte del tráfico del catálogo. Y el cursor
 * nativo sólo se esconde después de que estos elementos existen: si algo
 * falla antes, la tienda se queda con el puntero de siempre en vez de
 * quedarse sin ninguno.
 */
export function CursorMonaco() {
  useEffect(() => {
    const fino = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fino.matches) return;

    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const punto = document.createElement("div");
    punto.className = "cursor-punto";
    punto.setAttribute("aria-hidden", "true");

    const anillo = document.createElement("div");
    anillo.className = "cursor-anillo";
    anillo.setAttribute("aria-hidden", "true");

    document.body.append(punto, anillo);
    document.documentElement.dataset.cursor = "si";

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let seguidoX = x;
    let seguidoY = y;
    let cuadro = 0;

    const pintar = () => {
      // Con movimiento reducido el anillo no se rezaga: va pegado al
      // punto y desaparece la única parte animada de esto.
      const suavizado = quieto ? 1 : 0.2;
      seguidoX += (x - seguidoX) * suavizado;
      seguidoY += (y - seguidoY) * suavizado;

      punto.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(-35deg)`;
      anillo.style.transform = `translate(${seguidoX}px, ${seguidoY}px) translate(-50%, -50%) rotate(-35deg)`;

      cuadro = requestAnimationFrame(pintar);
    };
    cuadro = requestAnimationFrame(pintar);

    const mover = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;

      const destino = e.target instanceof Element ? e.target : null;
      // Sobre un campo de texto se cede el paso al cursor del sistema:
      // ahí la barra de inserción dice dónde va a caer la letra y eso no
      // se sustituye con un adorno.
      const sobreCampo = Boolean(destino?.closest(CAMPO));

      punto.style.opacity = sobreCampo ? "0" : "1";
      anillo.style.opacity = sobreCampo ? "0" : "1";
      anillo.classList.toggle(
        "cursor-anillo-activo",
        !sobreCampo && Boolean(destino?.closest(PULSABLE)),
      );
    };

    const esconder = () => {
      punto.style.opacity = "0";
      anillo.style.opacity = "0";
    };

    window.addEventListener("pointermove", mover, { passive: true });
    document.addEventListener("pointerleave", esconder);
    window.addEventListener("blur", esconder);

    return () => {
      cancelAnimationFrame(cuadro);
      window.removeEventListener("pointermove", mover);
      document.removeEventListener("pointerleave", esconder);
      window.removeEventListener("blur", esconder);
      punto.remove();
      anillo.remove();
      delete document.documentElement.dataset.cursor;
    };
  }, []);

  return null;
}
