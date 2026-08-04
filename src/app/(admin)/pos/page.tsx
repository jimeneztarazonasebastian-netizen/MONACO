import type { Metadata } from "next";
import Link from "next/link";

import { PantallaPos } from "@/components/pos/PantallaPos";
import { exigirSesion } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Caja POS" };

export default async function PaginaPos() {
  const perfil = await exigirSesion();
  const supabase = await crearClienteServidor();

  const [{ data: turno }, { data: tienda }] = await Promise.all([
    supabase.from("cash_sessions").select("id").is("closed_at", null).maybeSingle(),
    supabase
      .from("store_settings")
      .select("slogan, address, whatsapp, receipt_footer")
      .single(),
  ]);

  // Sin turno abierto no se vende. Es la regla del negocio, no un
  // capricho de la pantalla: sin turno no se sabe quién responde por el
  // efectivo al final del día.
  if (!turno) {
    return (
      <section className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="fuente-display mb-4 text-2xl">Caja cerrada</h1>
        <p className="mb-8 leading-relaxed text-gris">
          No hay ningún turno abierto. Cuenta la base con la que arranca la caja
          y ábrelo para poder vender.
        </p>
        <Link
          href="/caja"
          className="bisel-sm inline-flex h-16 items-center bg-rojo px-8 text-sm font-semibold tracking-[0.2em] text-blanco uppercase transition-opacity hover:opacity-90"
        >
          Abrir turno
        </Link>
      </section>
    );
  }

  return (
    <PantallaPos
      tienda={
        tienda ?? {
          slogan: null,
          address: null,
          whatsapp: null,
          receipt_footer: null,
        }
      }
      cajero={perfil.full_name ?? "Sin nombre"}
    />
  );
}
