"use client";

import { ESTADO_INICIAL } from "@/lib/actions/estado";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { EditorVariantes } from "@/components/admin/EditorVariantes";
import {
  AreaTexto,
  Aviso,
  BotonEnviar,
  Campo,
  Casilla,
  Seleccion,
} from "@/components/ui/campos";
import { crearProducto } from "@/lib/actions/productos";

export function FormularioNuevoProducto({
  categorias,
}: {
  categorias: { id: string; name: string }[];
}) {
  const [estado, accion] = useActionState(crearProducto, ESTADO_INICIAL);
  const router = useRouter();

  // Las fotos se suben en la pantalla de edición, cuando el producto ya
  // tiene id: sin id no hay carpeta donde ponerlas.
  useEffect(() => {
    if (estado.ok && estado.id) router.push(`/productos/${estado.id}`);
  }, [estado.ok, estado.id, router]);

  return (
    <form action={accion} className="flex flex-col gap-8">
      {/*
        Los defaultValue salen del estado devuelto por la acción. React 19
        reinicia el formulario en cuanto la acción termina, aunque haya
        fallado; sin esto, un error de validación borraría todo lo escrito.
      */}
      <section className="flex flex-col gap-5">
        <Campo
          etiqueta="Nombre de la prenda"
          name="nombre"
          defaultValue={estado.valores?.nombre ?? ""}
          required
          autoFocus
        />

        <AreaTexto
          etiqueta="Descripción"
          name="descripcion"
          defaultValue={estado.valores?.descripcion ?? ""}
          placeholder="Material, corte, cómo queda. Esto es lo que lee el cliente en el catálogo."
        />

        <Seleccion
          etiqueta="Categoría"
          name="categoria"
          defaultValue={estado.valores?.categoria ?? ""}
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
          defaultChecked={estado.valores?.destacado === "on"}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="fuente-display text-sm">Variantes</h2>
        <EditorVariantes />
      </section>

      <Aviso>{estado.error}</Aviso>

      <div className="flex flex-wrap gap-3">
        <BotonEnviar>Crear prenda</BotonEnviar>
        <button
          type="button"
          onClick={() => router.push("/productos")}
          className="bisel-sm h-12 border border-humo px-6 text-xs tracking-[0.2em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
