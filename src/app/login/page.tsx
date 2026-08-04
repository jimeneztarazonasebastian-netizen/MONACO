import type { Metadata } from "next";

import { FormularioLogin } from "@/components/ui/FormularioLogin";
import { LogoMonaco } from "@/components/ui/LogoMonaco";
import { supabaseConfigurado } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Entrar",
};

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ redirigir?: string }>;
}) {
  const { redirigir } = await searchParams;
  const destino =
    redirigir && redirigir.startsWith("/") && !redirigir.startsWith("//")
      ? redirigir
      : "/pos";

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-12 flex justify-center">
          <LogoMonaco alto={150} className="h-auto w-36" />
        </div>

        {!supabaseConfigurado ? (
          <div className="bisel mb-8 border border-humo bg-carbon p-5">
            <p className="mb-2 text-xs tracking-[0.18em] text-rojo uppercase">
              Falta la base de datos
            </p>
            <p className="text-sm leading-relaxed text-gris">
              No hay conexión configurada todavía. Copia{" "}
              <code className="font-mono text-blanco">.env.example</code> a{" "}
              <code className="font-mono text-blanco">.env.local</code> y pon la
              URL y la llave del proyecto de Supabase. Sin eso no se puede
              iniciar sesión.
            </p>
          </div>
        ) : null}

        <FormularioLogin redirigir={destino} />
      </div>
    </main>
  );
}
