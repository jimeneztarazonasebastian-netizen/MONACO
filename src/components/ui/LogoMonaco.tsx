import Image from "next/image";

/**
 * El logo real de la marca, tal como lo entregó el dueño.
 *
 * Es un lockup completo: el monograma, la palabra MÓNACO, "tienda de
 * ropa deportiva" y "since 2026". No se recorta, no se redibuja y no se
 * le cambia la tipografía — solo se escala.
 *
 * Hay dos archivos porque hay dos tintas, y las dos las entregó el
 * dueño; ninguna se generó invirtiendo la otra:
 *
 * - `/logo-monaco.png` — trazo blanco sobre transparente, para pantalla.
 * - `/logo-monaco-tinta.png` — trazo negro sobre transparente, para la
 *   impresora térmica. Ver `LogoTinta` más abajo.
 *
 * El lienzo de la versión de pantalla se deja cuadrado a propósito,
 * aunque el trazo solo ocupe la banda central: así el componente sigue
 * midiendo lo mismo que cuando el archivo era un JPEG y ningún llamado
 * tuvo que cambiar de medidas.
 */
export function LogoMonaco({
  alto = 48,
  prioridad = false,
  className = "",
}: {
  /** Alto en píxeles. El lienzo es cuadrado. */
  alto?: number;
  prioridad?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/logo-monaco.png"
      alt="Mónaco, tienda de ropa deportiva"
      width={alto}
      height={alto}
      priority={prioridad}
      className={className}
      // Sin optimizar: es un logo pequeño y ya viene comprimido; pasarlo
      // por el optimizador solo agrega latencia en la primera carga.
      unoptimized
    />
  );
}

/**
 * El mismo logo en negro, para lo que sale por la impresora térmica.
 *
 * Tres diferencias con `LogoMonaco`, todas por la térmica:
 *
 * - **Trazo negro.** La térmica quema puntos sobre papel blanco: un
 *   trazo blanco saldría invisible y un fondo negro saldría como un
 *   rectángulo sólido de tinta.
 * - **Sin margen.** Al archivo se le quitó el margen transparente que
 *   traía alrededor (no se tocó un píxel del trazo). Con el lienzo
 *   cuadrado del original se desperdiciaban casi dos centímetros de
 *   papel en blanco arriba y abajo, en un rollo de 58 mm.
 * - **`<img>` y no `next/image`.** El optimizador envuelve la etiqueta
 *   en un `<span>` con carga diferida, y en una ventana de impresión eso
 *   se traduce en tirillas que salen sin logo.
 *
 * `ancho` va en milímetros porque todo lo que se imprime está medido en
 * milímetros, no en píxeles.
 */
export function LogoTinta({ ancho = 40 }: { ancho?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-monaco-tinta.png"
      alt="Mónaco, tienda de ropa deportiva"
      style={{
        display: "block",
        width: `${ancho}mm`,
        height: "auto",
        margin: "0 auto",
      }}
    />
  );
}
