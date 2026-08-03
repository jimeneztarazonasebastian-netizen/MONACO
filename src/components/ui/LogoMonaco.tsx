import Image from "next/image";

/**
 * El logo real de la marca, tal como lo entregó el dueño.
 *
 * Es un lockup completo: el monograma, la palabra MÓNACO, "tienda de
 * ropa deportiva" y "since 2026". No se recorta, no se redibuja y no se
 * le cambia la tipografía — solo se escala. Cualquier necesidad de una
 * versión distinta (horizontal, sobre fondo claro, para la impresora
 * térmica) se le pide al dueño, no se inventa aquí.
 *
 * El archivo es un JPEG con fondo negro sólido, así que encaja sobre el
 * negro de la interfaz sin recorte. Sobre cualquier otro fondo se vería
 * el cuadro.
 */
export function LogoMonaco({
  alto = 48,
  prioridad = false,
  className = "",
}: {
  /** Alto en píxeles. El logo es cuadrado. */
  alto?: number;
  prioridad?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/logo-monaco.jpeg"
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
