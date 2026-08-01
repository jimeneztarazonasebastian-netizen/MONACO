import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccionesVenta } from "@/components/admin/AccionesVenta";
import { BotonReimprimir } from "@/components/admin/BotonReimprimir";
import { fechaHora, pesos } from "@/lib/formato";
import { exigirSesion } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Venta" };

const NOMBRE_METODO: Record<string, string> = {
  efectivo: "Efectivo",
  nequi: "Nequi",
  daviplata: "Daviplata",
  bancolombia: "Bancolombia",
  tarjeta: "Tarjeta",
};

const NOMBRE_ESTADO: Record<string, string> = {
  pagada: "Pagada",
  pendiente: "Pendiente de confirmar",
  anulada: "Anulada",
};

export default async function PaginaVenta({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirSesion();
  const { id } = await params;
  const supabase = await crearClienteServidor();

  const [{ data: venta }, { data: tienda }, { data: devoluciones }] = await Promise.all([
    supabase
      .from("sales")
      .select(
        "id, number, channel, status, subtotal, discount, total, notes, created_at, paid_at, profiles(full_name), customers(full_name, phone, address), sale_items(id, product_name, sku, size, color, quantity, unit_price), sale_payments(id, method, amount, reference, received, change_due)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("store_settings")
      .select("store_name, address, whatsapp, receipt_footer")
      .maybeSingle(),
    supabase
      .from("sale_returns")
      .select("id, sale_item_id, product_name, size, color, quantity, amount, reason, created_at")
      .eq("sale_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!venta) notFound();

  const cajero =
    (venta.profiles as unknown as { full_name: string } | null)?.full_name ??
    "Sin nombre";
  const cliente = venta.customers as unknown as {
    full_name: string;
    phone: string | null;
    address: string | null;
  } | null;

  const pagos = venta.sale_payments ?? [];
  const efectivo = pagos
    .filter((p) => p.method === "efectivo")
    .reduce((s, p) => s + p.amount, 0);
  const recibido = pagos.find((p) => p.received !== null)?.received ?? null;
  const devuelta = pagos.find((p) => p.change_due !== null)?.change_due ?? null;

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/ventas"
        className="mb-6 inline-block text-xs tracking-[0.16em] text-gris uppercase transition-colors hover:text-blanco print:hidden"
      >
        ← Ventas
      </Link>

      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3 print:hidden">
        <h1 className="fuente-display text-2xl">{venta.number}</h1>
        <span
          className={`text-xs tracking-[0.16em] uppercase ${
            venta.status === "anulada" ? "text-rojo" : "text-gris"
          }`}
        >
          {NOMBRE_ESTADO[venta.status] ?? venta.status} ·{" "}
          {venta.channel === "web" ? "Catálogo" : "Mostrador"}
        </span>
      </div>

      <dl className="mb-8 grid grid-cols-2 gap-4 border-b border-humo pb-6 text-sm print:hidden">
        <div>
          <dt className="text-xs tracking-[0.16em] text-gris uppercase">Fecha</dt>
          <dd className="text-blanco">{fechaHora(venta.created_at)}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-[0.16em] text-gris uppercase">Atendió</dt>
          <dd className="text-blanco">{cajero}</dd>
        </div>
        {cliente ? (
          <div className="col-span-2">
            <dt className="text-xs tracking-[0.16em] text-gris uppercase">
              Cliente
            </dt>
            <dd className="text-blanco">
              {cliente.full_name}
              {cliente.phone ? (
                <span className="font-mono text-gris"> · {cliente.phone}</span>
              ) : null}
            </dd>
            {cliente.address ? (
              <dd className="text-xs text-gris">{cliente.address}</dd>
            ) : null}
          </div>
        ) : null}
      </dl>

      <ul className="mb-6 flex flex-col print:hidden">
        {(venta.sale_items ?? []).map((i) => (
          <li
            key={i.id}
            className="flex flex-wrap items-baseline justify-between gap-3 border-b border-humo py-3"
          >
            <span className="min-w-40 flex-1">
              <span className="block text-sm text-blanco">{i.product_name}</span>
              <span className="block font-mono text-xs text-gris">
                {i.size} · {i.color} · {i.sku}
              </span>
            </span>
            <span className="font-mono text-xs text-gris">
              {i.quantity} × {pesos(i.unit_price)}
            </span>
            <span className="w-28 text-right font-mono text-sm text-blanco">
              {pesos(i.unit_price * i.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mb-8 flex flex-col gap-2 print:hidden">
        {venta.discount > 0 ? (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gris">Subtotal</span>
              <span className="font-mono text-blanco">{pesos(venta.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gris">Descuento</span>
              <span className="font-mono text-rojo">-{pesos(venta.discount)}</span>
            </div>
          </>
        ) : null}

        <div className="flex items-baseline justify-between border-t border-humo pt-3">
          <span className="text-sm tracking-[0.16em] text-gris uppercase">
            Total
          </span>
          <span className="fuente-display text-2xl">{pesos(venta.total)}</span>
        </div>

        {pagos.map((p) => (
          <div key={p.id} className="flex justify-between text-sm">
            <span className="text-gris">
              {NOMBRE_METODO[p.method] ?? p.method}
              {p.reference ? (
                <span className="font-mono text-xs"> · {p.reference}</span>
              ) : null}
            </span>
            <span className="font-mono text-blanco">{pesos(p.amount)}</span>
          </div>
        ))}

        {devuelta !== null && devuelta > 0 ? (
          <div className="flex justify-between text-sm">
            <span className="text-gris">Cambio</span>
            <span className="font-mono text-blanco">{pesos(devuelta)}</span>
          </div>
        ) : null}
      </div>

      {venta.notes ? (
        <p className="mb-8 text-sm text-gris print:hidden">{venta.notes}</p>
      ) : null}

      {devoluciones && devoluciones.length > 0 ? (
        <section className="mb-8 print:hidden">
          <h2 className="fuente-display mb-4 text-sm">Devoluciones</h2>
          <ul className="flex flex-col">
            {devoluciones.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-baseline justify-between gap-3 border-b border-humo py-3 text-sm"
              >
                <span className="min-w-40 flex-1">
                  <span className="block text-blanco">
                    {d.quantity} × {d.product_name}
                    <span className="font-mono text-xs text-gris">
                      {" "}
                      {d.size}/{d.color}
                    </span>
                  </span>
                  <span className="block text-xs text-gris">
                    {d.reason} · {fechaHora(d.created_at)}
                  </span>
                </span>
                <span className="font-mono text-rojo">-{pesos(d.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mb-8">
        <AccionesVenta
          ventaId={venta.id}
          numero={venta.number}
          anulada={venta.status === "anulada"}
          items={(venta.sale_items ?? []).map((i) => ({
            id: i.id,
            product_name: i.product_name,
            size: i.size,
            color: i.color,
            quantity: i.quantity,
            unit_price: i.unit_price,
            devuelto: (devoluciones ?? [])
              .filter((d) => d.sale_item_id === i.id)
              .reduce((s, d) => s + d.quantity, 0),
          }))}
        />
      </div>

      <BotonReimprimir
        venta={{
          numero: venta.number,
          fecha: venta.paid_at ?? venta.created_at,
          cajero,
          lineas: (venta.sale_items ?? []).map((i) => ({
            variantId: i.id,
            productName: i.product_name,
            size: i.size ?? "",
            color: i.color ?? "",
            precio: i.unit_price,
            cantidad: i.quantity,
          })),
          descuento: venta.discount,
          total: venta.total,
          pagos: pagos.map((p) => ({ metodo: p.method, monto: p.amount })),
          recibido: recibido ?? (efectivo > 0 ? efectivo : null),
          devuelta,
        }}
        tienda={
          tienda ?? {
            store_name: "Mónaco",
            address: null,
            whatsapp: null,
            receipt_footer: null,
          }
        }
      />
    </section>
  );
}
