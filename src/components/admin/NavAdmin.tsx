"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { RolUsuario } from "@/types/database";

type Enlace = {
  href: string;
  etiqueta: string;
  /** Si es true, solo lo ve el dueño. */
  soloAdmin?: boolean;
};

const ENLACES: Enlace[] = [
  { href: "/pos", etiqueta: "Caja POS" },
  { href: "/ventas", etiqueta: "Ventas" },
  { href: "/caja", etiqueta: "Turno" },
  { href: "/pedidos", etiqueta: "Pedidos web", soloAdmin: true },
  { href: "/productos", etiqueta: "Productos", soloAdmin: true },
  { href: "/inventario", etiqueta: "Inventario", soloAdmin: true },
  { href: "/configuracion", etiqueta: "Configuración", soloAdmin: true },
];

export function NavAdmin({ rol }: { rol: RolUsuario }) {
  const pathname = usePathname();
  const visibles = ENLACES.filter((e) => !e.soloAdmin || rol === "admin");

  return (
    <nav aria-label="Secciones" className="flex flex-wrap gap-1">
      {visibles.map((enlace) => {
        const activo =
          pathname === enlace.href || pathname.startsWith(`${enlace.href}/`);

        return (
          <Link
            key={enlace.href}
            href={enlace.href}
            aria-current={activo ? "page" : undefined}
            className={[
              "px-4 py-3 text-xs tracking-[0.16em] uppercase transition-colors",
              activo
                ? "bg-humo text-blanco"
                : "text-gris hover:bg-carbon hover:text-blanco",
            ].join(" ")}
          >
            {enlace.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
