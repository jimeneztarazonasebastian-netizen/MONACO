const PX_POR_MM = 96 / 25.4;

/**
 * Imprime un bloque de 58 mm dándole al papel la altura que de verdad ocupa.
 *
 * El problema que resuelve: `@page { size: 58mm auto }` **es CSS inválido**.
 * La especificación admite `auto` a solas o una o dos medidas, pero no
 * mezclar una medida con `auto`, así que el navegador descarta la regla
 * entera y el papel cae al de por defecto, A4. Se comprobó contra el
 * CSSOM: `58mm auto` no deja rastro en la regla, mientras que
 * `58mm 100mm`, `A4` y `auto` sí se registran.
 *
 * Dos consecuencias, y ninguna daba error:
 *
 * - **La vista previa tarda muchísimo.** Para pintar una tira de 58 mm el
 *   navegador rasteriza páginas de 210 mm de ancho, casi todo papel en
 *   blanco. En el celular, donde cada página del previo se convierte en un
 *   mapa de bits a resolución de impresión, se queda en "preparando vista
 *   previa".
 * - **En el rollo térmico se iría el papel en blanco**: la impresora
 *   avanzaría los 297 mm de un A4 por cada tirilla de 116 mm.
 *
 * La salida es medir el contenido y escribir la altura en milímetros justo
 * antes de imprimir. Hay que medir a la fuerza porque en pantalla el bloque
 * vive en `display:none` y un elemento sin caja no tiene altura que
 * consultar: se saca fuera de la pantalla, se mide y se devuelve como
 * estaba.
 *
 * @param selectorBloque  el bloque que sale por la impresora (`#tirilla`).
 * @param selectorUnidad  si el bloque son varias piezas que no se deben
 *   partir (las etiquetas), el selector de una: el papel toma la altura de
 *   la más alta y cada pieza cae en su propia página. Sin esto, 25
 *   etiquetas serían una sola página de metro y medio.
 */
export function imprimir58mm(selectorBloque: string, selectorUnidad?: string) {
  const bloque = document.querySelector<HTMLElement>(selectorBloque);
  if (!bloque) {
    window.print();
    return;
  }

  const estiloPrevio = bloque.getAttribute("style") ?? "";
  bloque.setAttribute(
    "style",
    `${estiloPrevio};display:block;position:absolute;left:-10000px;top:0;width:58mm;padding:2mm`,
  );

  const piezas = selectorUnidad
    ? Array.from(bloque.querySelectorAll<HTMLElement>(selectorUnidad))
    : [];
  const alturaPx = piezas.length
    ? Math.max(...piezas.map((p) => p.getBoundingClientRect().height))
    : bloque.getBoundingClientRect().height;

  if (estiloPrevio) bloque.setAttribute("style", estiloPrevio);
  else bloque.removeAttribute("style");

  // Redondeo hacia arriba y un milímetro de holgura: si la página queda
  // corta por una fracción, el sobrante cae en una segunda página en
  // blanco y la impresora saca el doble de papel.
  const alturaMm = Math.ceil(alturaPx / PX_POR_MM) + 1;

  const hoja = document.createElement("style");
  hoja.textContent = `@page { size: 58mm ${alturaMm}mm; margin: 0 }`;
  document.head.appendChild(hoja);

  // La regla se retira después de imprimir, no enseguida: `window.print()`
  // bloquea en el escritorio pero no en todos los navegadores móviles, y
  // quitarla antes de tiempo deja el trabajo con el papel por defecto.
  const limpiar = () => {
    hoja.remove();
    window.removeEventListener("afterprint", limpiar);
  };
  window.addEventListener("afterprint", limpiar);
  window.setTimeout(limpiar, 60_000);

  window.print();
}
