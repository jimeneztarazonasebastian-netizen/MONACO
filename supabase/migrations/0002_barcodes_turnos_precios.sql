-- =====================================================================
-- MÓNACO — Migración 0002
-- Ajustes según decisiones: códigos de barras mixtos (fábrica / internos),
-- múltiples cajeros con turnos y cierre de caja, precios por variante.
-- Ejecutar DESPUÉS de 0001_monaco_schema.sql
-- =====================================================================

-- =====================================================================
-- 1. CÓDIGOS DE BARRAS MIXTOS
-- Algunas prendas llegan con barras de fábrica y otras no. Guardamos de
-- dónde salió el código para saber a cuáles hay que imprimirles etiqueta.
-- =====================================================================

create type barcode_source as enum ('fabrica', 'interno');

alter table product_variants
  add column barcode_source barcode_source,
  add column label_printed   boolean not null default false;

-- El código interno usa el prefijo EAN-13 200-299, reservado justamente
-- para uso dentro del comercio: no choca con ningún GTIN real del mundo.
create sequence internal_barcode_seq start 1;

create or replace function public.ean13_check_digit(p_twelve text)
returns text language plpgsql immutable as $$
declare s int := 0; i int; d int;
begin
  for i in 1..12 loop
    d := substr(p_twelve, i, 1)::int;
    s := s + case when i % 2 = 0 then d * 3 else d end;
  end loop;
  return ((10 - (s % 10)) % 10)::text;
end $$;

create or replace function public.generate_internal_barcode()
returns text language plpgsql as $$
declare v_base text;
begin
  -- 200 + 9 dígitos correlativos + dígito verificador
  v_base := '200' || lpad(nextval('internal_barcode_seq')::text, 9, '0');
  return v_base || public.ean13_check_digit(v_base);
end $$;

-- SKU legible para humanos: MON-CAMNEG-M-NEG-0042
create or replace function public.generate_sku(p_product_id uuid, p_size text, p_color text)
returns text language plpgsql as $$
declare v_name text; v_slug text;
begin
  select upper(substr(regexp_replace(unaccent(name), '[^a-zA-Z]', '', 'g'), 1, 6))
    into v_name from products where id = p_product_id;
  v_slug := 'MON-' || v_name || '-' ||
            upper(regexp_replace(p_size, '\s', '', 'g')) || '-' ||
            upper(substr(regexp_replace(unaccent(p_color), '[^a-zA-Z]', '', 'g'), 1, 3));
  return v_slug || '-' || lpad((floor(random() * 9999))::int::text, 4, '0');
end $$;

-- Si al crear la variante no llega SKU o código, se generan solos y se
-- marca la etiqueta como pendiente de imprimir.
create or replace function public.variant_defaults()
returns trigger language plpgsql as $$
begin
  if new.sku is null or new.sku = '' then
    new.sku := public.generate_sku(new.product_id, new.size, new.color);
  end if;
  if new.barcode is null or new.barcode = '' then
    new.barcode := public.generate_internal_barcode();
    new.barcode_source := 'interno';
    new.label_printed := false;
  elsif new.barcode_source is null then
    new.barcode_source := 'fabrica';
    new.label_printed := true;   -- ya viene impresa de fábrica
  end if;
  return new;
end $$;

create trigger t_variant_defaults
  before insert on product_variants
  for each row execute function public.variant_defaults();

alter table product_variants alter column sku drop not null;

-- Cola de etiquetas por imprimir
create or replace view v_labels_pending as
  select v.id, p.name as product, v.sku, v.barcode, v.size, v.color, v.sale_price, v.stock
  from product_variants v join products p on p.id = v.product_id
  where v.is_active and v.barcode_source = 'interno' and not v.label_printed;

-- =====================================================================
-- 2. TURNOS Y CIERRE DE CAJA
-- Con varios trabajadores esto deja de ser opcional: sin turno no se sabe
-- quién respondía por el efectivo cuando falta plata.
-- =====================================================================

create table cash_sessions (
  id              uuid primary key default gen_random_uuid(),
  opened_by       uuid not null references profiles(id),
  closed_by       uuid references profiles(id),
  opening_amount  numeric(12,2) not null default 0 check (opening_amount >= 0),
  counted_amount  numeric(12,2),          -- lo que el cajero contó al cerrar
  expected_amount numeric(12,2),          -- lo que el sistema calculó
  difference      numeric(12,2),          -- sobrante (+) o faltante (-)
  notes           text,
  opened_at       timestamptz not null default now(),
  closed_at       timestamptz
);

create unique index idx_one_open_session
  on cash_sessions ((closed_at is null)) where closed_at is null;

alter table sales add column cash_session_id uuid references cash_sessions(id);
create index idx_sales_session on sales(cash_session_id);

create or replace function public.open_cash_session(p_opening numeric default 0)
returns cash_sessions
language plpgsql security definer set search_path = public as $$
declare v cash_sessions;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if exists (select 1 from cash_sessions where closed_at is null) then
    raise exception 'Ya hay una caja abierta. Ciérrala antes de abrir otra.';
  end if;
  insert into cash_sessions (opened_by, opening_amount)
  values (auth.uid(), p_opening) returning * into v;
  return v;
end $$;

create or replace function public.close_cash_session(
  p_counted numeric,
  p_notes   text default null
) returns cash_sessions
language plpgsql security definer set search_path = public as $$
declare v cash_sessions; v_efectivo numeric(12,2);
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  select * into v from cash_sessions where closed_at is null for update;
  if not found then raise exception 'No hay caja abierta'; end if;

  -- Solo el efectivo debe cuadrar contra el conteo físico
  select coalesce(sum(sp.amount), 0) into v_efectivo
  from sale_payments sp
  join sales s on s.id = sp.sale_id
  where s.cash_session_id = v.id and s.status = 'pagada' and sp.method = 'efectivo';

  update cash_sessions set
    closed_by       = auth.uid(),
    closed_at       = now(),
    counted_amount  = p_counted,
    expected_amount = v.opening_amount + v_efectivo,
    difference      = p_counted - (v.opening_amount + v_efectivo),
    notes           = p_notes
  where id = v.id returning * into v;
  return v;
end $$;

-- Resumen del turno para la pantalla de cierre y la tirilla de arqueo
create or replace function public.cash_session_summary(p_session_id uuid default null)
returns table (
  session_id uuid, cajero text, abierta_desde timestamptz,
  base numeric, ventas int, total_vendido numeric,
  efectivo numeric, nequi numeric, daviplata numeric,
  bancolombia numeric, tarjeta numeric, esperado_en_caja numeric
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
    s.opening_amount + coalesce(sum(sp.amount) filter (where sp.method = 'efectivo'), 0)
  from s
  join profiles pr on pr.id = s.opened_by
  left join sales v2 on v2.cash_session_id = s.id and v2.status = 'pagada'
  left join sale_payments sp on sp.sale_id = v2.id
  group by s.id, s.opened_at, s.opening_amount, pr.full_name;
$$;

-- =====================================================================
-- 3. create_pos_sale ahora exige turno abierto y lo amarra a la venta
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

  select id into v_session from cash_sessions where closed_at is null;
  if v_session is null then
    raise exception 'No hay caja abierta. Abre el turno antes de vender.';
  end if;

  insert into sales (channel, status, customer_id, cashier_id, cash_session_id, discount, notes, paid_at)
  values ('pos', 'pagada', p_customer_id, auth.uid(), v_session, p_discount, p_notes, now())
  returning * into v_sale;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;

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

  for v_pay in select * from jsonb_array_elements(p_payments) loop
    insert into sale_payments (sale_id, method, amount, reference, received, change_due)
    values (v_sale.id, (v_pay->>'method')::payment_method, (v_pay->>'amount')::numeric,
            v_pay->>'reference', (v_pay->>'received')::numeric, (v_pay->>'change_due')::numeric);
    v_paid := v_paid + (v_pay->>'amount')::numeric;
  end loop;

  update sales set subtotal = v_subtotal, total = v_subtotal - p_discount
    where id = v_sale.id returning * into v_sale;

  if v_paid < v_sale.total then
    raise exception 'El pago (%) no cubre el total (%)', v_paid, v_sale.total;
  end if;

  return v_sale;
end $$;

-- =====================================================================
-- 4. PRECIOS POR VARIANTE
-- El precio ya vive en product_variants, así que cada talla y color puede
-- tener el suyo. Estas funciones son para editar en bloque sin sufrir.
-- =====================================================================

-- Mismo precio para todas las variantes del producto
create or replace function public.set_product_price(p_product_id uuid, p_price numeric)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Solo el administrador cambia precios'; end if;
  update product_variants set sale_price = p_price, updated_at = now()
    where product_id = p_product_id;
  get diagnostics n = row_count;
  update products set base_price = p_price where id = p_product_id;
  return n;
end $$;

-- Precio distinto por talla: {"S":89900,"M":89900,"L":94900,"XL":99900}
create or replace function public.set_price_by_size(p_product_id uuid, p_prices jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare k text; n int := 0; c int;
begin
  if not public.is_admin() then raise exception 'Solo el administrador cambia precios'; end if;
  for k in select jsonb_object_keys(p_prices) loop
    update product_variants
      set sale_price = (p_prices->>k)::numeric, updated_at = now()
      where product_id = p_product_id and size = k;
    get diagnostics c = row_count; n := n + c;
  end loop;
  update products set base_price = (select min(sale_price) from product_variants where product_id = p_product_id)
    where id = p_product_id;
  return n;
end $$;

-- El catálogo muestra "desde $X" cuando el precio varía entre variantes
create or replace view v_catalog as
  select p.id, p.name, p.slug, p.description, p.images, p.category_id, p.is_featured,
         min(v.sale_price) as price_from,
         max(v.sale_price) as price_to,
         (min(v.sale_price) <> max(v.sale_price)) as price_varies,
         sum(v.stock) as total_stock,
         array_agg(distinct v.size)  as sizes,
         array_agg(distinct v.color) as colors
  from products p
  join product_variants v on v.product_id = p.id and v.is_active
  where p.is_active
  group by p.id;

-- =====================================================================
-- 5. ROLES: el dueño es admin, los trabajadores son cajeros
-- =====================================================================

drop policy if exists "staff escribe productos"  on products;
drop policy if exists "staff escribe variantes"  on product_variants;
drop policy if exists "staff escribe categorias" on categories;

-- Todo el staff lee el catálogo completo (incluso lo inactivo)
create policy "staff lee productos"  on products          for select to authenticated using (true);
create policy "staff lee variantes"  on product_variants  for select to authenticated using (true);
create policy "staff lee categorias" on categories        for select to authenticated using (true);

-- Solo el dueño crea, edita y borra
create policy "admin gestiona productos"  on products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin gestiona variantes"  on product_variants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin gestiona categorias" on categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table cash_sessions enable row level security;
create policy "staff ve turnos"    on cash_sessions for select to authenticated using (true);
create policy "admin edita turnos" on cash_sessions for update to authenticated using (public.is_admin());

-- Los ajustes de inventario quedan reservados al dueño
create or replace function public.adjust_stock(
  p_variant_id uuid, p_quantity int,
  p_type movement_type default 'ajuste', p_note text default null
) returns int
language plpgsql security definer set search_path = public as $$
declare v_new int;
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador ajusta inventario';
  end if;
  update product_variants set stock = stock + p_quantity, updated_at = now()
    where id = p_variant_id returning stock into v_new;
  insert into inventory_movements (variant_id, type, quantity, stock_after, user_id, note)
  values (p_variant_id, p_type, p_quantity, v_new, auth.uid(), p_note);
  return v_new;
end $$;

grant execute on function public.open_cash_session, public.close_cash_session,
                          public.cash_session_summary, public.set_product_price,
                          public.set_price_by_size to authenticated;
revoke all on function public.open_cash_session, public.close_cash_session from anon;
