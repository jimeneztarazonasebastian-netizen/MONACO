-- =====================================================================
-- MÓNACO — Migración 0009
--
-- Anular una venta que YA tenía devoluciones parciales rompía dos cosas:
--
-- 1. Reponía todas las unidades vendidas sin descontar las que ya
--    habían vuelto. Una prenda devuelta y luego anulada entraba dos
--    veces al inventario: el sistema creía tener una prenda más de las
--    que hay en la percha.
--
-- 2. El efectivo esperado se iba a negativo. `cash_esperado` solo
--    contaba los pagos de ventas 'pagada', así que al anular la venta su
--    plata desaparecía del cálculo — como si nunca hubiera entrado al
--    cajón — mientras la salida del reintegro seguía restando. El
--    reintegro se contaba dos veces.
--
-- El modelo que arregla las dos: los movimientos de plata son hechos y
-- no se borran. Si entró al cajón, entró; si se devolvió, sale como
-- salida explícita. El estado de la venta no reescribe la historia.
-- =====================================================================

-- Enlazar cada salida con su venta permite saber cuánto se reintegró ya.
alter table cash_movements
  add column if not exists sale_id uuid references sales(id) on delete set null;

create index if not exists idx_cash_mov_sale on cash_movements(sale_id);

-- =====================================================================
-- El efectivo esperado cuenta lo que de verdad entró al cajón
-- =====================================================================

create or replace function public.cash_esperado(p_session uuid)
returns numeric
language sql stable security definer set search_path = public as $$
  select (
    s.opening_amount
    -- `paid_at is not null` en vez de status='pagada': una venta anulada
    -- sí metió plata al cajón en su momento. Lo que la saca después es
    -- la salida del reintegro, no borrar el ingreso.
    + coalesce((
        select sum(sp.amount) from sale_payments sp
        join sales v on v.id = sp.sale_id
        where v.cash_session_id = s.id
          and v.paid_at is not null
          and sp.method = 'efectivo'
      ), 0)
    + coalesce((
        select sum(m.amount) from cash_movements m
        where m.cash_session_id = s.id and m.type = 'entrada'
      ), 0)
    - coalesce((
        select sum(m.amount) from cash_movements m
        where m.cash_session_id = s.id and m.type = 'salida'
      ), 0)
  )::numeric(12,2)
  from cash_sessions s where s.id = p_session;
$$;

-- =====================================================================
-- Anular descontando lo ya devuelto
-- =====================================================================

drop function if exists public.void_sale(uuid, text);

create function public.void_sale(
  p_sale_id            uuid,
  p_motivo             text,
  p_reintegro_efectivo boolean default false
) returns sales
language plpgsql security definer set search_path = public as $$
declare
  v_sale     sales;
  v_item     sale_items;
  v_devueltas int;
  v_reponer  int;
  v_stock    int;
  v_efectivo numeric(12,2);
  v_ya_salio numeric(12,2);
  v_falta    numeric(12,2);
  v_session  uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador anula ventas';
  end if;
  if coalesce(btrim(p_motivo), '') = '' then
    raise exception 'Escribe por qué se anula la venta';
  end if;

  select * into v_sale from sales where id = p_sale_id for update;
  if not found then raise exception 'La venta no existe'; end if;
  if v_sale.status = 'anulada' then raise exception 'Esa venta ya está anulada'; end if;

  if v_sale.status = 'pagada' then
    for v_item in select * from sale_items where sale_id = p_sale_id loop
      -- Lo que ya volvió por una devolución parcial no se repone otra vez.
      select coalesce(sum(quantity), 0) into v_devueltas
      from sale_returns where sale_item_id = v_item.id;

      v_reponer := v_item.quantity - v_devueltas;

      if v_reponer > 0 and v_item.variant_id is not null then
        update product_variants
          set stock = stock + v_reponer, updated_at = now()
          where id = v_item.variant_id
          returning stock into v_stock;

        insert into inventory_movements
          (variant_id, type, quantity, stock_after, sale_id, user_id, note)
        values (v_item.variant_id, 'devolucion', v_reponer, v_stock,
                p_sale_id, auth.uid(),
                'Anulación ' || v_sale.number || ': ' || btrim(p_motivo));
      end if;
    end loop;

    -- Reintegro del efectivo que todavía no se había devuelto.
    if p_reintegro_efectivo then
      select coalesce(sum(sp.amount), 0) into v_efectivo
      from sale_payments sp where sp.sale_id = p_sale_id and sp.method = 'efectivo';

      select coalesce(sum(m.amount), 0) into v_ya_salio
      from cash_movements m where m.sale_id = p_sale_id and m.type = 'salida';

      v_falta := v_efectivo - v_ya_salio;

      if v_falta > 0 then
        select id into v_session from cash_sessions where closed_at is null;
        if v_session is null then
          raise exception 'No hay turno abierto para sacar el reintegro del cajón';
        end if;
        insert into cash_movements (cash_session_id, type, amount, reason, user_id, sale_id)
        values (v_session, 'salida', v_falta,
                'Anulación ' || v_sale.number || ': ' || btrim(p_motivo),
                auth.uid(), p_sale_id);
      end if;
    end if;
  end if;

  update sales set
    status    = 'anulada',
    voided_at = now(),
    notes     = coalesce(notes || ' · ', '') || 'Anulada: ' || btrim(p_motivo)
  where id = p_sale_id
  returning * into v_sale;

  return v_sale;
end $$;

-- =====================================================================
-- Las devoluciones también enlazan su salida con la venta
-- =====================================================================

create or replace function public.return_sale_items(
  p_sale_id            uuid,
  p_items              jsonb,
  p_motivo             text,
  p_reintegro_efectivo boolean default false
) returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_sale  sales;
  v_it    jsonb;
  v_item  sale_items;
  v_qty   int;
  v_previas int;
  v_monto numeric(12,2);
  v_total numeric(12,2) := 0;
  v_stock int;
  v_session uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador registra devoluciones';
  end if;
  if coalesce(btrim(p_motivo), '') = '' then
    raise exception 'Escribe el motivo de la devolución';
  end if;

  select * into v_sale from sales where id = p_sale_id for update;
  if not found then raise exception 'La venta no existe'; end if;
  if v_sale.status <> 'pagada' then
    raise exception 'Solo se devuelven prendas de ventas pagadas';
  end if;

  for v_it in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_it->>'quantity')::int, 0);
    continue when v_qty <= 0;

    select * into v_item from sale_items
    where id = (v_it->>'sale_item_id')::uuid and sale_id = p_sale_id;
    if not found then raise exception 'Esa prenda no pertenece a la venta'; end if;

    select coalesce(sum(quantity), 0) into v_previas
    from sale_returns where sale_item_id = v_item.id;

    if v_previas + v_qty > v_item.quantity then
      raise exception 'De % se vendieron % y ya se devolvieron %',
        v_item.product_name, v_item.quantity, v_previas;
    end if;

    v_monto := (v_item.unit_price * v_qty)::numeric(12,2);

    if v_item.variant_id is not null then
      update product_variants
        set stock = stock + v_qty, updated_at = now()
        where id = v_item.variant_id
        returning stock into v_stock;

      insert into inventory_movements
        (variant_id, type, quantity, stock_after, sale_id, user_id, note)
      values (v_item.variant_id, 'devolucion', v_qty, v_stock, p_sale_id, auth.uid(),
              'Devolución ' || v_sale.number || ': ' || btrim(p_motivo));
    end if;

    insert into sale_returns
      (sale_id, sale_item_id, variant_id, product_name, size, color,
       quantity, amount, reason, user_id)
    values (p_sale_id, v_item.id, v_item.variant_id, v_item.product_name,
            v_item.size, v_item.color, v_qty, v_monto, btrim(p_motivo), auth.uid());

    v_total := v_total + v_monto;
  end loop;

  if v_total = 0 then raise exception 'No seleccionaste ninguna prenda'; end if;

  if p_reintegro_efectivo then
    select id into v_session from cash_sessions where closed_at is null;
    if v_session is null then
      raise exception 'No hay turno abierto para sacar el reintegro del cajón';
    end if;
    insert into cash_movements (cash_session_id, type, amount, reason, user_id, sale_id)
    values (v_session, 'salida', v_total,
            'Devolución ' || v_sale.number || ': ' || btrim(p_motivo),
            auth.uid(), p_sale_id);
  end if;

  return v_total;
end $$;

revoke execute on function
  public.cash_esperado(uuid),
  public.void_sale(uuid, text, boolean),
  public.return_sale_items(uuid, jsonb, text, boolean)
from public, anon;

grant execute on function
  public.cash_esperado(uuid),
  public.void_sale(uuid, text, boolean),
  public.return_sale_items(uuid, jsonb, text, boolean)
to authenticated;
