"use client";

import { useActionState, useState } from "react";

import { EditorVariantes } from "@/components/admin/EditorVariantes";
import { Aviso, BotonEnviar, Campo, Etiqueta, Seleccion } from "@/components/ui/campos";
import { ESTADO_INICIAL } from "@/lib/actions/estado";
import {
  actualizarVariante,
  agregarVariantes,
  ajustarStock,
  cambiarEstadoVariante,
  fijarPrecioUnico,
} from "@/lib/actions/productos";
import { pesos } from "@/lib/formato";
import type { Variante } from "@/types/database";

/** Una fila de la tabla, que se despliega para editar o mover stock. */
function FilaVariante({
  variante,
  productoId,
}: {
  variante: Variante;
  productoId: string;
}) {
  const [abierta, setAbierta] = useState<null | "editar" | "stock">(null);
  const [estadoEdicion, accionEditar] = useActionState(
    actualizarVariante,
    ESTADO_INICIAL,
  );
  const [estadoStock, accionStock] = useActionState(ajustarStock, ESTADO_INICIAL);

  const agotada = variante.stock === 0;
  const escasa = !agotada && variante.stock <= variante.low_stock_threshold;

  return (
    <>
      <tr className={`border-b border-humo/50 ${!variante.is_active ? "opacity-40" : ""}`}>
        <td className="py-3 pr-3">
          <span className="badge-diagonal inline-block bg-humo px-3 py-1">
            <span className="badge-diagonal-texto font-mono text-xs text-blanco">
              {variante.size}
            </span>
          </span>
        </td>
        <td className="py-3 pr-3 text-sm text-blanco">{variante.color}</td>
        <td className="py-3 pr-3 font-mono text-sm text-blanco">
          {pesos(variante.sale_price)}
        </td>
        <td className="py-3 pr-3 font-mono text-sm">
          <span className={agotada ? "text-rojo" : escasa ? "text-rojo" : "text-blanco"}>
            {variante.stock}
          </span>
          {escasa ? <span className="ml-2 text-xs text-rojo">bajo</span> : null}
          {agotada ? <span className="ml-2 text-xs text-rojo">agotada</span> : null}
        </td>
        <td className="py-3 pr-3 font-mono text-xs text-gris">
          <span className="block">{variante.sku}</span>
          <span className="block">
            {variante.barcode}
            {variante.barcode_source === "interno" && !variante.label_printed ? (
              <span className="ml-2 text-rojo">etiqueta pendiente</span>
            ) : null}
          </span>
        </td>
        <td className="py-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAbierta(abierta === "editar" ? null : "editar")}
              className="border border-humo px-3 py-2 text-xs tracking-[0.14em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setAbierta(abierta === "stock" ? null : "stock")}
              className="border border-humo px-3 py-2 text-xs tracking-[0.14em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
            >
              Stock
            </button>
            <form
              action={cambiarEstadoVariante.bind(
                null,
                variante.id,
                productoId,
                !variante.is_active,
              )}
            >
              <button
                type="submit"
                className="border border-humo px-3 py-2 text-xs tracking-[0.14em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
              >
                {variante.is_active ? "Archivar" : "Reactivar"}
              </button>
            </form>
          </div>
        </td>
      </tr>

      {abierta === "editar" ? (
        <tr>
          <td colSpan={6} className="pb-6">
            <form
              action={accionEditar}
              className="bisel-sm border border-humo bg-carbon p-4"
            >
              <input type="hidden" name="id" value={variante.id} />
              <input type="hidden" name="producto_id" value={productoId} />

              <div className="flex flex-wrap gap-4">
                {/* Si la edición falló, se repone lo que se escribió. */}
                <Campo
                  etiqueta="Talla"
                  name="talla"
                  defaultValue={estadoEdicion.valores?.talla ?? variante.size}
                  className="w-24"
                  required
                />
                <Campo
                  etiqueta="Color"
                  name="color"
                  defaultValue={estadoEdicion.valores?.color ?? variante.color}
                  className="w-36"
                  required
                />
                <Campo
                  etiqueta="Costo"
                  name="costo"
                  inputMode="numeric"
                  defaultValue={estadoEdicion.valores?.costo ?? variante.cost_price}
                  className="w-32"
                />
                <Campo
                  etiqueta="Precio"
                  name="precio"
                  inputMode="numeric"
                  defaultValue={estadoEdicion.valores?.precio ?? variante.sale_price}
                  className="w-32"
                  required
                />
                <Campo
                  etiqueta="Avisar bajo"
                  name="aviso_stock"
                  inputMode="numeric"
                  defaultValue={
                    estadoEdicion.valores?.aviso_stock ?? variante.low_stock_threshold
                  }
                  className="w-28"
                  ayuda="Unidades"
                />
              </div>

              <p className="mt-3 text-xs text-gris">
                El stock no se edita aquí: se mueve desde{" "}
                <strong className="text-blanco">Stock</strong>, para que todo
                cambio quede en el kardex.
              </p>

              <div className="mt-4">
                <Aviso>{estadoEdicion.error}</Aviso>
              </div>

              <div className="mt-4">
                <BotonEnviar variante="secundario">Guardar variante</BotonEnviar>
              </div>
            </form>
          </td>
        </tr>
      ) : null}

      {abierta === "stock" ? (
        <tr>
          <td colSpan={6} className="pb-6">
            <form
              action={accionStock}
              className="bisel-sm border border-humo bg-carbon p-4"
            >
              <input type="hidden" name="variante_id" value={variante.id} />
              <input type="hidden" name="producto_id" value={productoId} />

              <p className="mb-4 font-mono text-sm text-gris">
                Hoy hay <span className="text-blanco">{variante.stock}</span>{" "}
                unidades de {variante.size} / {variante.color}.
              </p>

              <div className="flex flex-wrap gap-4">
                <Seleccion
                  etiqueta="Motivo"
                  name="tipo"
                  defaultValue={estadoStock.valores?.tipo ?? "entrada"}
                >
                  <option value="entrada">Entrada de mercancía</option>
                  <option value="ajuste">Ajuste por conteo</option>
                  <option value="merma">Merma o daño</option>
                  {/* `salida` ya existía en el kardex pero el desplegable
                      nunca la ofrecía, así que una prenda que se iba a una
                      foto de Instagram o de vuelta al proveedor sólo se
                      podía registrar como merma — y merma significa que se
                      dañó, que es otra cosa y ensucia el reporte. */}
                  <option value="salida">Salida (muestra, garantía, uso interno)</option>
                  <option value="devolucion">Devolución de cliente</option>
                </Seleccion>
                <Campo
                  etiqueta="Cantidad"
                  name="cantidad"
                  inputMode="numeric"
                  placeholder="10 o -3"
                  defaultValue={estadoStock.valores?.cantidad ?? ""}
                  className="w-36"
                  ayuda="Negativo para sacar"
                  required
                />
                <Campo
                  etiqueta="Nota"
                  name="nota"
                  placeholder="Llegó pedido del proveedor"
                  defaultValue={estadoStock.valores?.nota ?? ""}
                  className="min-w-56 flex-1"
                  required
                />
              </div>

              <div className="mt-4">
                <Aviso>{estadoStock.error}</Aviso>
              </div>

              <div className="mt-4">
                <BotonEnviar variante="secundario">Mover stock</BotonEnviar>
              </div>
            </form>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function VariantesProducto({
  productoId,
  variantes,
}: {
  productoId: string;
  variantes: Variante[];
}) {
  const [agregando, setAgregando] = useState(false);
  const [estadoAgregar, accionAgregar] = useActionState(
    agregarVariantes,
    ESTADO_INICIAL,
  );
  const [estadoPrecio, accionPrecio] = useActionState(
    fijarPrecioUnico,
    ESTADO_INICIAL,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-3xl border-collapse text-left">
          <thead>
            <tr className="border-b border-humo">
              {["Talla", "Color", "Precio", "Stock", "SKU y código", ""].map((h) => (
                <th key={h} className="pb-2 pr-3">
                  <Etiqueta>{h}</Etiqueta>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variantes.map((v) => (
              <FilaVariante key={v.id} variante={v} productoId={productoId} />
            ))}
          </tbody>
        </table>
      </div>

      {variantes.length === 0 ? (
        <p className="text-sm text-gris">
          Esta prenda no tiene variantes, así que no se puede vender.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setAgregando((a) => !a)}
          className="bisel-sm h-12 border border-humo px-6 text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
        >
          {agregando ? "Cancelar" : "Agregar variantes"}
        </button>
      </div>

      {agregando ? (
        <form
          action={accionAgregar}
          className="bisel border border-humo bg-carbon p-5"
        >
          <input type="hidden" name="producto_id" value={productoId} />
          <EditorVariantes />
          <div className="mt-5">
            <Aviso>{estadoAgregar.error}</Aviso>
          </div>
          <div className="mt-5">
            <BotonEnviar>Agregar</BotonEnviar>
          </div>
        </form>
      ) : null}

      {variantes.length > 1 ? (
        <form
          action={accionPrecio}
          className="bisel border border-humo bg-carbon p-5"
        >
          <input type="hidden" name="producto_id" value={productoId} />
          <p className="mb-4 text-xs tracking-[0.16em] text-gris uppercase">
            Mismo precio para todas las tallas
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <Campo
              etiqueta="Precio"
              name="precio"
              inputMode="numeric"
              placeholder="89900"
              className="w-40"
            />
            <BotonEnviar variante="secundario">Aplicar a todas</BotonEnviar>
          </div>
          <div className="mt-4">
            <Aviso>{estadoPrecio.error}</Aviso>
          </div>
        </form>
      ) : null}
    </div>
  );
}
