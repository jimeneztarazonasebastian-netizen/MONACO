/**
 * Marcador para las pantallas que todavía no se han construido.
 * Existe para que el cascarón de administración se pueda navegar y
 * probar de punta a punta sin fingir que hay funcionalidad donde no la
 * hay. Se borra a medida que cada módulo se implementa de verdad.
 */
export function Pendiente({
  titulo,
  descripcion,
  paso,
}: {
  titulo: string;
  descripcion: string;
  paso: string;
}) {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="fuente-display mb-6 text-2xl">{titulo}</h1>
      <p className="mb-8 leading-relaxed text-gris">{descripcion}</p>
      <p className="bisel-sm border-l-2 border-rojo bg-carbon px-5 py-4 text-sm text-gris">
        Sin construir todavía. Va en el {paso} del orden de trabajo del
        CLAUDE.md.
      </p>
    </section>
  );
}
