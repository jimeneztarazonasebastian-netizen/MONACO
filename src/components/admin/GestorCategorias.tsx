"use client";

import { useActionState } from "react";

import { Aviso, BotonEnviar, Campo, Seleccion } from "@/components/ui/campos";
import { ESTADO_INICIAL } from "@/lib/actions/estado";
import { cambiarEstadoCategoria, crearCategoria } from "@/lib/actions/productos";

type Categoria = {
  id: string;
  name: string;
  is_active: boolean;
  parent_id: string | null;
};

export function GestorCategorias({ categorias }: { categorias: Categoria[] }) {
  const [estado, accion] = useActionState(crearCategoria, ESTADO_INICIAL);
  const porId = new Map(categorias.map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col gap-8">
      <form action={accion} className="bisel border border-humo bg-carbon p-5">
        <div className="flex flex-wrap items-end gap-3">
          <Campo
            etiqueta="Nombre"
            name="nombre"
            placeholder="Hombre, Mujer, Accesorios"
            className="min-w-56 flex-1"
            ayuda="Separa con comas para crear varias de una vez"
            required
          />
          <Seleccion etiqueta="Dentro de" name="padre" defaultValue="">
            <option value="">Nivel principal</option>
            {categorias
              .filter((c) => c.is_active && !c.parent_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Seleccion>
          <BotonEnviar>Crear</BotonEnviar>
        </div>
        <div className="mt-4">
          <Aviso>{estado.error}</Aviso>
        </div>
      </form>

      {categorias.length > 0 ? (
        <ul className="flex flex-col">
          {categorias.map((categoria) => (
            <li
              key={categoria.id}
              className={`flex flex-wrap items-center justify-between gap-3 border-b border-humo py-4 ${
                categoria.is_active ? "" : "opacity-40"
              }`}
            >
              <span>
                <span className="text-blanco">{categoria.name}</span>
                {categoria.parent_id ? (
                  <span className="ml-3 text-xs text-gris">
                    dentro de {porId.get(categoria.parent_id) ?? "—"}
                  </span>
                ) : null}
              </span>

              <form
                action={cambiarEstadoCategoria.bind(
                  null,
                  categoria.id,
                  !categoria.is_active,
                )}
              >
                <button
                  type="submit"
                  className="border border-humo px-4 py-2 text-xs tracking-[0.14em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
                >
                  {categoria.is_active ? "Archivar" : "Reactivar"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gris">
          Todavía no hay categorías. Sin ellas el catálogo no se puede filtrar.
        </p>
      )}
    </div>
  );
}
