-- =====================================================================
-- MÓNACO — Migración 0008
-- Los tres huecos que una tienda de ropa encuentra la primera semana:
-- anular una venta mal hecha, devolver una prenda, y sacar plata de la
-- caja para un domicilio.
-- =====================================================================

-- =====================================================================
-- 1. DEVOLUCIONES
-- Tabla propia en vez de tocar sale_items: la venta original no se
-- reescribe nunca. Si se editara la cantidad vendida, la tirilla que el
-- cliente tiene en la mano dejaría de coincidir con el sistema y no
-- habría forma de saber qué pasó.
-- =====================================================================

create table if not exists sale_returns (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null references sales(id) on delete cascade,
  sale_item_id uuid references sale_items(id) on delete set null,
  variant_id   uuid references product_variants(id) on delete set null,
  product_name text not null,
  size         text,
  color        text,
  quantity     int  not null check (quantity > 0),
  amount       numeric(12,2) not null check (amount >= 0),
  reason       text not null,
  user_id      uuid references profiles(id),
  created_at   timestamptz not null default now()
);

create index if not exists idx_returns_sale  on sale_returns(sale_id);
create index if not exists idx_returns_item  on sale_returns(sale_item_id);
create index if not exists idx_returns_fecha on sale_returns(created_at desc);

alter table sale_returns enable row level security;

drop policy if exists "staff lee devoluciones" on sale_returns;
create policy "staff lee devoluciones" on sale_returns
  for select to authenticated using (true);

-- =====================================================================
-- 2. MOVIMIENTOS DE CAJA
-- Sin esto, sacar 20.000 para un domicilio aparecía como un faltante al
-- cierre y se lo cargaba el cajero.
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'cash_movement_type') then
    create type cash_movement_type as enum ('entrada', 'salida');
  end if;
end $$;

create table if not exists cash_movements (
  id               uuid primary key default gen_random_uuid(),
  cash_session_id  uuid not null references cash_sessions(id) on delete cascade,
  type             cash_movement_type not null,
  amount           numeric(12,2) not null check (amount > 0),
  reason           text not null,
  user_id          uuid references profiles(id),
  created_at       timestamptz not null default now()
);

create index if not exists idx_cash_mov_session on cash_movements(cash_session_id);

alter table cash_movements enable row level security;

drop policy if exists "staff ve movimientos de caja" on cash_movements;
create policy "staff ve movimientos de caja" on cash_movements
  for select to authenticated using (true);

-- =====================================================================
-- 3. EFECTIVO ESPERADO
-- Un solo sitio que lo calcule. Antes vivía repetido dentro de
-- close_cash_session y de cash_session_summary, y ahora que además hay
-- entradas y salidas, tenerlo en dos sitios es garantía de que un día
-- dejen de coincidir.
-- =====================================================================

create or replace function public.cash_esperado(p_session uuid)
returns numeric
language sql stable security definer set search_path = public as $$
  select (
    s.opening_amount
    + coalesce((
        select sum(sp.amount) from sale_payments sp
        join sales v on v.id = sp.sale_id
        where v.cash_session_id = s.id
          and v.status = 'pagada'
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

create or replace function public.register_cash_movement(
  p_tipo   cash_movement_type,
  p_monto  numeric,
  p_motivo text
) returns cash_movements
language plpgsql security definer set search_path = public as $$
declare v_session uuid; v_mov cash_movements; v_disponible numeric(12,2);
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if coalesce(p_monto, 0) <= 0 then raise exception 'El monto debe ser mayor que cero'; end if;
  if coalesce(btrim(p_motivo), '') = '' then
    raise exception 'Escribe de dónde sale o a dónde va la plata';
  end if;

  select id into v_session from cash_sessions where closed_at is null;
  if v_session is null then
    raise exception 'No hay turno abierto. Ábrelo antes de mover efectivo.';
  end if;

  -- No se puede sacar más de lo que hay en el cajón.
  if p_tipo = 'salida' then
    v_disponible := public.cash_esperado(v_session);
    if p_monto > v_disponible then
      raise exception 'En la caja solo hay % y quieres sacar %', v_disponible, p_monto;
    end if;
  end if;

  insert into cash_movements (cash_session_id, type, amount, reason, user_id)
  values (v_session, p_tipo, p_monto, btrim(p_motivo), auth.uid())
  returning * into v_mov;

  return v_mov;
end $$;

-- =====================================================================
-- 4. ANULAR UNA VENTA
-- Devuelve el stock y deja el rastro. La venta no se borra: el número
-- de tirilla que el cliente tiene en la mano tiene que seguir existiendo
-- en el sistema, aunque sea para decir que se anuló y por qué.
-- =====================================================================

create or replace function public.void_sale(p_sale_id uuid, p_motivo text)
returns sales
language plpgsql security definer set search_path = public as $$
declare v_sale sales; v_item sale_items; v_stock int;
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

  -- Solo las pagadas movieron inventario. Un pedido web pendiente nunca
  -- descontó nada, así que anularlo no devuelve stock.
  if v_sale.status = 'pagada' then
    for v_item in select * from sale_items where sale_id = p_sale_id loop
      if v_item.variant_id is not null then
        update product_variants
          set stock = stock + v_item.quantity, updated_at = now()
          where id = v_item.variant_id
          returning stock into v_stock;

        insert into inventory_movements
          (variant_id, type, quantity, stock_after, sale_id, user_id, note)
        values (v_item.variant_id, 'devolucion', v_item.quantity, v_stock,
                p_sale_id, auth.uid(),
                'Anulación ' || v_sale.number || ': ' || btrim(p_motivo));
      end if;
    end loop;
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
-- 5. DEVOLVER PRENDAS SUELTAS
-- El cambio de talla se hace con esto más una venta nueva: se devuelve
-- la que no sirvió y se vende la que sí. Así el inventario de cada talla
-- queda bien y el kardex cuenta la historia completa.
-- =====================================================================

create or replace function public.return_sale_items(
  p_sale_id           uuid,
  p_items             jsonb,
  p_motivo            text,
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

    -- No se puede devolver más de lo que se llevó, ni sumando varias
    -- devoluciones parciales del mismo renglón.
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

  -- Si la plata sale del cajón, queda registrada como salida de caja.
  -- Sin esto el arqueo del turno mostraría un faltante inexplicable.
  if p_reintegro_efectivo then
    select id into v_session from cash_sessions where closed_at is null;
    if v_session is null then
      raise exception 'No hay turno abierto para sacar el reintegro del cajón';
    end if;
    insert into cash_movements (cash_session_id, type, amount, reason, user_id)
    values (v_session, 'salida', v_total,
            'Devolución ' || v_sale.number || ': ' || btrim(p_motivo), auth.uid());
  end if;

  return v_total;
end $$;

-- =====================================================================
-- 6. EL ARQUEO AHORA CUENTA LAS ENTRADAS Y SALIDAS
-- =====================================================================

create or replace function public.close_cash_session(
  p_counted numeric,
  p_notes   text default null
) returns cash_sessions
language plpgsql security definer set search_path = public as $$
declare v cash_sessions; v_esperado numeric(12,2);
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  select * into v from cash_sessions where closed_at is null for update;
  if not found then raise exception 'No hay caja abierta'; end if;

  v_esperado := public.cash_esperado(v.id);

  update cash_sessions set
    closed_by       = auth.uid(),
    closed_at       = now(),
    counted_amount  = p_counted,
    expected_amount = v_esperado,
    difference      = p_counted - v_esperado,
    notes           = p_notes
  where id = v.id returning * into v;
  return v;
end $$;

-- El tipo de retorno cambia, así que hay que soltarla y rehacerla.
drop function if exists public.cash_session_summary(uuid);

create function public.cash_session_summary(p_session_id uuid default null)
returns table (
  session_id uuid, cajero text, abierta_desde timestamptz,
  base numeric, ventas int, total_vendido numeric,
  efectivo numeric, nequi numeric, daviplata numeric,
  bancolombia numeric, tarjeta numeric,
  entradas numeric, salidas numeric, esperado_en_caja numeric
)
language sql stable security definer set search_path = public as $$
  with s as (
    select * from cash_sessions
    where id = coalesce(p_session_id, (select id from cash_sessions where closed_at is null))
  )
  select s.id, pr.full_name, s.opened_at, s.opening_amount,
    (select count(*)::int from sales v where v.cash_session_id = s.id and v.status = 'pagada'),
    coalesce((select sum(v.total) from sales v where v.cash_session_id = s.id and v.status = 'pagada'), 0),
    coalesce(sum(sp.amount) filter (where sp.method = 'efectivo'), 0),
    coalesce(sum(sp.amount) filter (where sp.method = 'nequi'), 0),
    coalesce(sum(sp.amount) filter (where sp.method = 'daviplata'), 0),
    coalesce(sum(sp.amount) filter (where sp.method = 'bancolombia'), 0),
    coalesce(sum(sp.amount) filter (where sp.method = 'tarjeta'), 0),
    coalesce((select sum(m.amount) from cash_movements m
               where m.cash_session_id = s.id and m.type = 'entrada'), 0),
    coalesce((select sum(m.amount) from cash_movements m
               where m.cash_session_id = s.id and m.type = 'salida'), 0),
    public.cash_esperado(s.id)
  from s
  join profiles pr on pr.id = s.opened_by
  left join sales v2 on v2.cash_session_id = s.id and v2.status = 'pagada'
  left join sale_payments sp on sp.sale_id = v2.id
  group by s.id, s.opened_at, s.opening_amount, pr.full_name;
$$;

-- =====================================================================
-- 7. LOS REPORTES DESCUENTAN LAS DEVOLUCIONES
-- Una prenda devuelta dejó de ser un ingreso. Si el reporte la sigue
-- contando, el dueño toma decisiones con plata que ya no tiene.
-- =====================================================================

drop function if exists public.reporte_resumen(date, date);

create function public.reporte_resumen(p_desde date, p_hasta date)
returns table (
  ventas          int,
  unidades        int,
  ingresos        numeric,
  devoluciones    numeric,
  descuentos      numeric,
  costo           numeric,
  margen          numeric,
  ticket_promedio numeric
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador ve los reportes';
  end if;

  return query
  with v as (
    select s.id, s.total, s.discount
    from sales s
    where s.status = 'pagada'
      and (s.created_at at time zone 'America/Bogota')::date between p_desde and p_hasta
  ),
  i as (
    select sum(si.quantity)::int as unidades,
           sum(si.unit_cost * si.quantity) as costo
    from sale_items si join v on v.id = si.sale_id
  ),
  d as (
    select coalesce(sum(r.amount), 0) as monto,
           coalesce(sum(r.quantity), 0)::int as unidades,
           coalesce(sum(si.unit_cost * r.quantity), 0) as costo
    from sale_returns r
    left join sale_items si on si.id = r.sale_item_id
    where (r.created_at at time zone 'America/Bogota')::date between p_desde and p_hasta
  )
  select
    (select count(*)::int from v),
    (coalesce((select i.unidades from i), 0) - (select d.unidades from d)),
    (coalesce((select sum(v.total) from v), 0) - (select d.monto from d))::numeric(12,2),
    (select d.monto from d)::numeric(12,2),
    coalesce((select sum(v.discount) from v), 0)::numeric(12,2),
    (coalesce((select i.costo from i), 0) - (select d.costo from d))::numeric(12,2),
    ((coalesce((select sum(v.total) from v), 0) - (select d.monto from d))
     - (coalesce((select i.costo from i), 0) - (select d.costo from d)))::numeric(12,2),
    case
      when (select count(*) from v) = 0 then 0
      else (coalesce((select sum(v.total) from v), 0)
            / (select count(*) from v))::numeric(12,2)
    end;
end $$;

-- =====================================================================
-- 8. PERMISOS
-- =====================================================================

revoke execute on function
  public.cash_esperado(uuid),
  public.register_cash_movement(cash_movement_type, numeric, text),
  public.void_sale(uuid, text),
  public.return_sale_items(uuid, jsonb, text, boolean),
  public.close_cash_session(numeric, text),
  public.cash_session_summary(uuid),
  public.reporte_resumen(date, date)
from public, anon;

grant execute on function
  public.cash_esperado(uuid),
  public.register_cash_movement(cash_movement_type, numeric, text),
  public.void_sale(uuid, text),
  public.return_sale_items(uuid, jsonb, text, boolean),
  public.close_cash_session(numeric, text),
  public.cash_session_summary(uuid),
  public.reporte_resumen(date, date)
to authenticated;
