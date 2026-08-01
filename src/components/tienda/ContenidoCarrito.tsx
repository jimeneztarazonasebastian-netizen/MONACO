"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { pesos } from "@/lib/formato";
import { urlImagen } from "@/lib/imagenes";
import { crearPedidoWeb, revisarCarrito } from "@/lib/actions/pedidos";
import { plural } from "@/lib/texto";
import { enlaceWhatsapp, esNumeroValido, mensajePedido } from "@/lib/whatsapp";
import { totalCarrito, unidadesCarritoWeb, usarCarrito } from "@/store/carrito";

type Paso = "carrito" | "datos" | "listo";

const CLASE_CAMPO =
  "h-14 w-full border border-humo bg-carbon px-4 text-base text-blanco placeholder:text-gris focus:border-gris focus:outline-none";

export function ContenidoCarrito({
  whatsappTienda,
}: {
  whatsappTienda: string | null;
}) {
  const { lineas, cambiarCantidad, quitar, vaciar, sincronizar } = usarCarrito();
  const [montado, setMontado] = useState(false);
  const [paso, setPaso] = useState<Paso>("carrito");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cambios, setCambios] = useState<string | null>(null);
  const [pedido, setPedido] = useState<{ numero: string; enlace: string } | null>(
    null,
  );

  // El carrito vive en localStorage, que en el servidor no existe, y
  // puede tener días: se revisa contra la tienda antes de mostrarlo. Sin
  // esto el cliente descubre que una prenda ya no está solo al confirmar,
  // con un error que no le dice cuál.
  useEffect(() => {
    let vigente = true;

    (async () => {
      const guardadas = usarCarrito.getState().lineas;

      if (guardadas.length > 0) {
        const estado = await revisarCarrito(guardadas.map((l) => l.variantId));
        if (!vigente) return;

        const { retiradas, ajustadas } = sincronizar(estado);
        const avisos: string[] = [];

        if (retiradas.length > 0) {
          avisos.push(
            `${retiradas.join(", ")} ya no ${retiradas.length === 1 ? "está disponible" : "están disponibles"} y ${retiradas.length === 1 ? "se quitó" : "se quitaron"} del carrito.`,
          );
        }
        if (ajustadas.length > 0) {
          avisos.push(
            `Actualizamos precio o cantidad de: ${ajustadas.join(", ")}.`,
          );
        }
        if (avisos.length > 0) setCambios(avisos.join(" "));
      }

      if (vigente) setMontado(true);
    })();

    return () => {
      vigente = false;
    };
  }, [sincronizar]);

  if (!montado) {
    return <section className="mx-auto max-w-3xl px-5 py-16" aria-busy="true" />;
  }

  const total = totalCarrito(lineas);
  const unidades = unidadesCarritoWeb(lineas);
  const hayWhatsapp = esNumeroValido(whatsappTienda);

  // --- Pedido creado ----------------------------------------------------
  if (paso === "listo" && pedido) {
    return (
      <section className="mx-auto max-w-lg px-5 py-20 text-center">
        <p className="mb-2 text-xs tracking-[0.18em] text-gris uppercase">
          Pedido registrado
        </p>
        <p className="fuente-display mb-8 text-4xl">{pedido.numero}</p>

        <p className="mb-10 leading-relaxed text-gris">
          Falta un paso: mándanos el mensaje por WhatsApp para confirmarlo.
          Ahí acordamos el pago y la entrega. Tu pedido queda apartado con ese
          número.
        </p>

        <a
          href={pedido.enlace}
          target="_blank"
          rel="noopener noreferrer"
          className="bisel-sm inline-flex h-16 w-full items-center justify-center bg-rojo px-8 text-sm font-semibold tracking-[0.2em] text-blanco uppercase transition-opacity hover:opacity-90"
        >
          Abrir WhatsApp
        </a>

        <Link
          href="/catalogo"
          className="mt-6 inline-block text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:text-blanco"
        >
          Seguir viendo el catálogo
        </Link>
      </section>
    );
  }

  if (lineas.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h1 className="fuente-display mb-5 text-2xl">Tu carrito está vacío</h1>
        <p className="mb-10 text-gris">
          {cambios ?? "Todavía no has agregado ninguna prenda."}
        </p>
        <Link
          href="/catalogo"
          className="bisel-sm inline-flex h-14 items-center border border-humo px-10 text-xs tracking-[0.2em] text-gris uppercase transition-colors hover:border-gris hover:text-blanco"
        >
          Ver el catálogo
        </Link>
      </section>
    );
  }

  async function enviar(formData: FormData) {
    setEnviando(true);
    setError(null);

    const cliente = {
      full_name: String(formData.get("nombre") ?? "").trim(),
      phone: String(formData.get("telefono") ?? "").trim(),
      address: String(formData.get("direccion") ?? "").trim() || undefined,
    };

    const resultado = await crearPedidoWeb(
      lineas.map((l) => ({ variant_id: l.variantId, quantity: l.cantidad })),
      cliente,
    );

    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }

    const mensaje = mensajePedido(resultado.numero, lineas, total, {
      nombre: cliente.full_name,
      direccion: cliente.address,
    });

    setPedido({
      numero: resultado.numero,
      enlace: enlaceWhatsapp(whatsappTienda!, mensaje),
    });
    vaciar();
    setPaso("listo");
  }

  // --- Datos del cliente ------------------------------------------------
  if (paso === "datos") {
    return (
      <section className="mx-auto max-w-lg px-5 py-12">
        <h1 className="fuente-display mb-3 text-2xl">Tus datos</h1>
        <p className="mb-8 text-sm leading-relaxed text-gris">
          Con esto apartamos el pedido y sabemos a quién escribirle. El pago se
          acuerda por WhatsApp.
        </p>

        <form action={enviar} className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-xs tracking-[0.16em] text-gris uppercase">
              Nombre
            </span>
            <input name="nombre" required autoFocus className={CLASE_CAMPO} />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs tracking-[0.16em] text-gris uppercase">
              Teléfono
            </span>
            <input
              name="telefono"
              inputMode="tel"
              required
              placeholder="300 123 4567"
              className={CLASE_CAMPO}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs tracking-[0.16em] text-gris uppercase">
              Dirección
            </span>
            <input
              name="direccion"
              placeholder="Opcional, si quieres domicilio"
              className={CLASE_CAMPO}
            />
          </label>

          <div className="flex items-baseline justify-between border-t border-humo pt-5">
            <span className="text-sm tracking-[0.16em] text-gris uppercase">
              Total
            </span>
            <span className="fuente-display text-2xl">{pesos(total)}</span>
          </div>

          {error ? (
            <p
              role="alert"
              className="border-l-2 border-rojo bg-rojo/10 px-4 py-3 text-sm"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={enviando}
            className="bisel-sm h-16 bg-rojo px-8 text-sm font-semibold tracking-[0.2em] text-blanco uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {enviando ? "Registrando…" : "Confirmar pedido"}
          </button>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setPaso("carrito");
            }}
            className="self-start text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:text-blanco"
          >
            ← Volver al carrito
          </button>
        </form>
      </section>
    );
  }

  // --- Carrito ----------------------------------------------------------
  return (
    <section className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="fuente-display mb-2 text-2xl">Tu carrito</h1>
      <p className="mb-6 font-mono text-xs text-gris">
        {plural(unidades, "prenda", "prendas")}
      </p>

      {cambios ? (
        <p className="mb-8 border-l-2 border-rojo bg-rojo/10 px-4 py-3 text-sm leading-relaxed">
          {cambios}
        </p>
      ) : null}

      <ul className="flex flex-col">
        {lineas.map((l) => {
          const foto = urlImagen(l.imagen);
          return (
            <li
              key={l.variantId}
              className="flex flex-wrap items-center gap-4 border-b border-humo py-5"
            >
              <div className="relative h-24 w-20 shrink-0 overflow-hidden border border-humo bg-carbon">
                {foto ? (
                  <Image src={foto} alt="" fill sizes="80px" className="object-cover" />
                ) : null}
              </div>

              <div className="min-w-40 flex-1">
                <Link
                  href={`/catalogo/${l.slug}`}
                  className="block text-sm text-blanco transition-colors hover:text-gris"
                >
                  {l.productName}
                </Link>
                <p className="font-mono text-xs text-gris">
                  {l.size} · {l.color}
                </p>
                <p className="mt-1 font-mono text-sm text-blanco">
                  {pesos(l.precio)}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => cambiarCantidad(l.variantId, l.cantidad - 1)}
                  aria-label={`Quitar una unidad de ${l.productName}`}
                  className="h-11 w-11 border border-humo text-lg text-blanco transition-colors hover:border-gris"
                >
                  −
                </button>
                <span className="w-10 text-center font-mono text-base text-blanco">
                  {l.cantidad}
                </span>
                <button
                  type="button"
                  onClick={() => cambiarCantidad(l.variantId, l.cantidad + 1)}
                  disabled={l.cantidad >= l.stock}
                  aria-label={`Agregar una unidad de ${l.productName}`}
                  className="h-11 w-11 border border-humo text-lg text-blanco transition-colors hover:border-gris disabled:opacity-30"
                >
                  +
                </button>
              </div>

              <span className="w-28 text-right font-mono text-sm text-blanco">
                {pesos(l.precio * l.cantidad)}
              </span>

              <button
                type="button"
                onClick={() => quitar(l.variantId)}
                aria-label={`Quitar ${l.productName} del carrito`}
                className="px-2 text-gris transition-colors hover:text-rojo"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex items-baseline justify-between border-t border-humo pt-6">
        <span className="text-sm tracking-[0.16em] text-gris uppercase">Total</span>
        <span className="fuente-display text-3xl">{pesos(total)}</span>
      </div>

      <div className="mt-10 flex flex-col gap-4">
        <button
          type="button"
          disabled={!hayWhatsapp}
          onClick={() => setPaso("datos")}
          className="bisel-sm h-16 bg-rojo px-8 text-sm font-semibold tracking-[0.2em] text-blanco uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Terminar por WhatsApp
        </button>

        {!hayWhatsapp ? (
          <p className="text-xs leading-relaxed text-rojo">
            La tienda todavía no ha configurado su número de WhatsApp, así que
            no se puede confirmar el pedido. Escríbenos por Instagram mientras
            tanto.
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-gris">
            No se cobra nada en línea. Al confirmar te abrimos el chat de la
            tienda con tu pedido ya redactado.
          </p>
        )}

        <button
          type="button"
          onClick={vaciar}
          className="self-start text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:text-rojo"
        >
          Vaciar el carrito
        </button>
      </div>
    </section>
  );
}
