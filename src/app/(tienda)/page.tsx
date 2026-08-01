import Link from "next/link";

import { Monograma } from "@/components/ui/Logotipo";

export default function PaginaInicio() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Monograma className="mb-8 h-16 w-16 text-blanco" />

      <h1 className="fuente-display mb-4 text-3xl sm:text-5xl">Mónaco</h1>
      <p className="mb-12 max-w-md leading-relaxed text-gris">
        Ropa deportiva. Bucaramanga.
        <br />
        La tienda en línea está en construcción.
      </p>

      <Link
        href="/login"
        className="bisel-sm border border-humo px-8 py-4 text-xs tracking-[0.2em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
      >
        Entrar a la caja
      </Link>
    </main>
  );
}
