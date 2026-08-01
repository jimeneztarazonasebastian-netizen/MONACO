-- =====================================================================
-- MÓNACO — Migración 0007
-- Reportes: cierre por día, métodos de pago, prendas más vendidas y
-- márgenes.
--
-- Agregan en la base y no en el frontend a propósito: traerse todas las
-- líneas de venta del mes al navegador para sumarlas ahí es lento y,
-- peor, pone los costos de la tienda en manos del cliente.
--
-- Todas llevan el control de rol adentro. El margen y el costo son
-- información del dueño: un cajero no tiene por qué saber cuánto gana la
-- tienda por prenda, y proteger eso solo en la pantalla no protege nada,
-- porque la API queda expuesta igual.
--
-- Las fechas se agrupan en hora de Bogotá. Con timestamptz en UTC, una
-- venta de las 8 de la noche cae al día siguiente y el cierre diario no
-- cuadra con lo que el dueño contó en la caja.
-- =====================================================================

create or replace function public.reporte_resumen(p_desde date, p_hasta date)
returns table (
  ventas          int,
  unidades        int,
  ingresos        numeric,
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
      and (s.created_at at time zone 'America/Bogota')::date
          between p_desde and p_hasta
  ),
  i as (
    select sum(si.quantity)::int as unidades,
           sum(si.unit_cost * si.quantity) as costo
    from sale_items si
    join v on v.id = si.sale_id
  )
  select
    (select count(*)::int from v),
    coalesce((select i.unidades from i), 0),
    coalesce((select sum(v.total) from v), 0)::numeric(12,2),
    coalesce((select sum(v.discount) from v), 0)::numeric(12,2),
    coalesce((select i.costo from i), 0)::numeric(12,2),
    (coalesce((select sum(v.total) from v), 0)
     - coalesce((select i.costo from i), 0))::numeric(12,2),
    case
      when (select count(*) from v) = 0 then 0
      else (coalesce((select sum(v.total) from v), 0)
            / (select count(*) from v))::numeric(12,2)
    end;
end $$;

create or replace function public.reporte_por_dia(p_desde date, p_hasta date)
returns table (
  dia      date,
  ventas   int,
  ingresos numeric,
  costo    numeric,
  margen   numeric
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador ve los reportes';
  end if;

  -- Los totales y los costos se suman por separado y se cruzan al
  -- final. Unir sales con sale_items y sumar s.total repetiría el total
  -- de la venta una vez por cada prenda: una venta de 100.000 con tres
  -- líneas reportaría 300.000.
  return query
  with dias as (
    select (s.created_at at time zone 'America/Bogota')::date as dia,
           s.id,
           s.total
    from sales s
    where s.status = 'pagada'
      and (s.created_at at time zone 'America/Bogota')::date
          between p_desde and p_hasta
  ),
  costos as (
    select d.dia, sum(si.unit_cost * si.quantity) as costo
    from dias d
    join sale_items si on si.sale_id = d.id
    group by d.dia
  ),
  totales as (
    select d.dia, count(*)::int as ventas, sum(d.total) as ingresos
    from dias d
    group by d.dia
  )
  select
    t.dia,
    t.ventas,
    t.ingresos::numeric(12,2),
    coalesce(c.costo, 0)::numeric(12,2),
    (t.ingresos - coalesce(c.costo, 0))::numeric(12,2)
  from totales t
  left join costos c on c.dia = t.dia
  order by t.dia desc;
end $$;

create or replace function public.reporte_por_metodo(p_desde date, p_hasta date)
returns table (
  metodo text,
  cobros int,
  total  numeric
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador ve los reportes';
  end if;

  return query
  select sp.method::text, count(*)::int, sum(sp.amount)::numeric(12,2)
  from sale_payments sp
  join sales s on s.id = sp.sale_id
  where s.status = 'pagada'
    and (s.created_at at time zone 'America/Bogota')::date between p_desde and p_hasta
  group by sp.method
  order by 3 desc;
end $$;

create or replace function public.reporte_top_prendas(
  p_desde  date,
  p_hasta  date,
  p_limite int default 15
)
returns table (
  producto  text,
  talla     text,
  color     text,
  unidades  int,
  ingresos  numeric,
  margen    numeric
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador ve los reportes';
  end if;

  return query
  select
    si.product_name,
    coalesce(si.size, ''),
    coalesce(si.color, ''),
    sum(si.quantity)::int,
    sum(si.unit_price * si.quantity - si.discount)::numeric(12,2),
    sum((si.unit_price - si.unit_cost) * si.quantity - si.discount)::numeric(12,2)
  from sale_items si
  join sales s on s.id = si.sale_id
  where s.status = 'pagada'
    and (s.created_at at time zone 'America/Bogota')::date between p_desde and p_hasta
  group by si.product_name, si.size, si.color
  order by 4 desc
  limit greatest(p_limite, 1);
end $$;

revoke execute on function
  public.reporte_resumen(date, date),
  public.reporte_por_dia(date, date),
  public.reporte_por_metodo(date, date),
  public.reporte_top_prendas(date, date, int)
from public, anon;

grant execute on function
  public.reporte_resumen(date, date),
  public.reporte_por_dia(date, date),
  public.reporte_por_metodo(date, date),
  public.reporte_top_prendas(date, date, int)
to authenticated;
