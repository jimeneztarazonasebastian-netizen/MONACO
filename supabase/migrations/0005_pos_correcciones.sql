-- =====================================================================
-- MÓNACO — Migración 0005
-- Dos correcciones que salieron al construir el POS.
-- =====================================================================

-- =====================================================================
-- 1. LA PISTOLA ENCONTRABA PRENDAS ARCHIVADAS
--
-- find_by_barcode solo miraba `v.is_active`, nunca `p.is_active`. Una
-- prenda archivada seguía apareciendo al escanear y se podía vender,
-- que es exactamente lo contrario de lo que archivar promete. El
-- catálogo y la búsqueda por nombre sí lo filtraban, así que el hueco
-- estaba únicamente en el camino de la pistola.
-- =====================================================================

create or replace function public.find_by_barcode(p_code text)
returns table (
  variant_id uuid, product_id uuid, product_name text,
  sku text, barcode text, size text, color text,
  sale_price numeric, stock int, images text[]
)
language sql stable security definer set search_path = public as $$
  select v.id, p.id, p.name, v.sku, v.barcode, v.size, v.color,
         v.sale_price, v.stock, p.images
  from product_variants v
  join products p on p.id = v.product_id
  where v.is_active
    and p.is_active
    and (v.barcode = btrim(p_code) or v.sku = upper(btrim(p_code)))
  limit 1;
$$;

-- =====================================================================
-- 2. EL DESCUENTO NO SE VALIDABA
--
-- `total = subtotal - p_discount` sin comprobar nada. Un descuento
-- negativo inflaba el total y uno mayor que el subtotal dejaba la venta
-- en negativo, con el kardex y el arqueo arrastrando esa cifra el resto
-- del día. Se valida antes de tocar el inventario.
-- =====================================================================

create or replace function public.create_pos_sale(
  p_items       jsonb,
  p_payments    jsonb,
  p_customer_id uuid default null,
  p_discount    numeric default 0,
  p_notes       text default null
) returns sales
language plpgsql security definer set search_path = public as $$
declare
  v_sale     sales;
  v_session  uuid;
  v_item     jsonb;
  v_pay      jsonb;
  v_variant  product_variants;
  v_qty      int;
  v_price    numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_paid     numeric(12,2) := 0;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'La venta no tiene productos'; end if;
  if coalesce(p_discount, 0) < 0 then
    raise exception 'El descuento no puede ser negativo';
  end if;

  select id into v_session from cash_sessions where closed_at is null;
  if v_session is null then
    raise exception 'No hay caja abierta. Abre el turno antes de vender.';
  end if;

  insert into sales (channel, status, customer_id, cashier_id, cash_session_id, discount, notes, paid_at)
  values ('pos', 'pagada', p_customer_id, auth.uid(), v_session, coalesce(p_discount, 0), p_notes, now())
  returning * into v_sale;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty <= 0 then raise exception 'Cantidad inválida'; end if;

    select * into v_variant from product_variants
    where id = (v_item->>'variant_id')::uuid for update;

    if not found then raise exception 'Variante no existe'; end if;
    if v_variant.stock < v_qty then
      raise exception 'Stock insuficiente para % (talla %, color %). Disponible: %',
        (select name from products where id = v_variant.product_id),
        v_variant.size, v_variant.color, v_variant.stock;
    end if;

    -- El precio de la variante manda. Un cajero solo puede rebajar, nunca subir.
    v_price := coalesce((v_item->>'unit_price')::numeric, v_variant.sale_price);
    if v_price > v_variant.sale_price and not public.is_admin() then
      raise exception 'No puedes vender por encima del precio de lista';
    end if;
    if v_price < 0 then raise exception 'El precio no puede ser negativo'; end if;

    insert into sale_items (sale_id, variant_id, product_name, sku, size, color,
                            unit_price, unit_cost, quantity, discount)
    values (v_sale.id, v_variant.id,
            (select name from products where id = v_variant.product_id),
            v_variant.sku, v_variant.size, v_variant.color,
            v_price, v_variant.cost_price, v_qty,
            coalesce((v_item->>'discount')::numeric, 0));

    update product_variants set stock = stock - v_qty, updated_at = now()
      where id = v_variant.id;

    insert into inventory_movements (variant_id, type, quantity, stock_after, sale_id, user_id)
    values (v_variant.id, 'venta', -v_qty, v_variant.stock - v_qty, v_sale.id, auth.uid());

    v_subtotal := v_subtotal + (v_price * v_qty) - coalesce((v_item->>'discount')::numeric, 0);
  end loop;

  if coalesce(p_discount, 0) > v_subtotal then
    raise exception 'El descuento (%) supera el subtotal (%)', p_discount, v_subtotal;
  end if;

  for v_pay in select * from jsonb_array_elements(p_payments) loop
    insert into sale_payments (sale_id, method, amount, reference, received, change_due)
    values (v_sale.id, (v_pay->>'method')::payment_method, (v_pay->>'amount')::numeric,
            v_pay->>'reference', (v_pay->>'received')::numeric, (v_pay->>'change_due')::numeric);
    v_paid := v_paid + (v_pay->>'amount')::numeric;
  end loop;

  update sales set subtotal = v_subtotal, total = v_subtotal - coalesce(p_discount, 0)
    where id = v_sale.id returning * into v_sale;

  if v_paid < v_sale.total then
    raise exception 'El pago (%) no cubre el total (%)', v_paid, v_sale.total;
  end if;

  return v_sale;
end $$;

revoke execute on function
  public.find_by_barcode(text),
  public.create_pos_sale(jsonb, jsonb, uuid, numeric, text)
from public, anon;

grant execute on function
  public.find_by_barcode(text),
  public.create_pos_sale(jsonb, jsonb, uuid, numeric, text)
to authenticated;
