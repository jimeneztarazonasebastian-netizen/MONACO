"use client";

import { ESTADO_INICIAL } from "@/lib/actions/estado";
import { useActionState } from "react";

import {
  AreaTexto,
  Aviso,
  BotonEnviar,
  Campo,
  Casilla,
  Seleccion,
} from "@/components/ui/campos";
import { actualizarProducto } from "@/lib/actions/productos";
import type { Producto } from "@/types/database";

export function FormularioEditarProducto({
  producto,
  categorias,
}: {
  producto: Producto;
  categorias: { id: string; name: string }[];
}) {
  const [estado, accion] = useActionState(actualizarProducto, ESTADO_INICIAL);

  return (
    <form action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={producto.id} />

      <Campo etiqueta="Nombre" name="nombre" defaultValue={producto.name} required />

      <AreaTexto
        etiqueta="Descripción"
        name="descripcion"
        defaultValue={producto.description ?? ""}
      />

      <Seleccion
        etiqueta="Categoría"
        name="categoria"
        defaultValue={producto.category_id ?? ""}
      >
        <option value="">Sin categoría</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Seleccion>

      <Casilla
        etiqueta="Destacar en la portada del catálogo"
        name="destacado"
        defaultChecked={producto.is_featured}
      />

      <Aviso>{estado.error}</Aviso>
      {estado.ok && !estado.error ? (
        <p className="text-sm text-gris">Guardado.</p>
      ) : null}

      <div>
        <BotonEnviar>Guardar</BotonEnviar>
      </div>
    </form>
  );
}
