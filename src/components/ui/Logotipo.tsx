/**
 * Logotipo provisional, dibujado en SVG.
 *
 * El monograma real todavía no existe en vectorial (solo hay PNG), así
 * que esto es un marcador con la geometría correcta: trazo continuo,
 * anguloso, y el corte a 35° de la marca. Cuando llegue el SVG oficial
 * se reemplaza solo este archivo.
 */
export function Monograma({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 33V7l15 18L35 7v26"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export function Logotipo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <Monograma className="h-7 w-7 text-blanco" />
      <span className="fuente-display text-lg leading-none">Mónaco</span>
    </span>
  );
}
