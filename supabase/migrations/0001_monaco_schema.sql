-- =====================================================================
-- MÓNACO — Migración 0001
-- Esquema base: catálogo, inventario por variante, ventas, kardex.
--
-- RECONSTRUIDA a partir de la sección 3 del CLAUDE.md. La original se
-- perdió. Está escrita para encajar exactamente con lo que la 0002
-- espera encontrar: si algo no cuadra, se ve al aplicar la 0002.
--
-- Lo que la 0002 exige de este archivo, y por eso no se puede cambiar
-- a la ligera:
--   · product_variants.sku NOT NULL   (la 0002 le quita el NOT NULL)
--   · las políticas "staff escribe productos/variantes/categorias"
--     (la 0002 las borra por nombre)
--   · public.is_admin()
--   · los enums payment_method y movement_type
--   · las columnas que tocan create_pos_sale, adjust_stock y las vistas
--
-- No se definen aquí `create_pos_sale`, `adjust_stock` ni `v_catalog`:
-- los crea la 0002 en su versión final. Definirlos dos veces solo
-- serviría para que las dos versiones se desincronicen.
-- =====================================================================

-- =====================================================================
-- 0. EXTENSIONES
-- =====================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists unaccent;   -- generate_sku() en la 0002

-- =====================================================================
-- 1. TIPOS
-- =====================================================================

create type user_role      as enum ('admin', 'cajero');
create type sale_channel   as enum ('pos', 'web');
create type sale_status    as enum ('pendiente', 'pagada', 'anulada');
create type payment_method as enum ('efectivo', 'nequi', 'daviplata', 'bancolombia', 'tarjeta');

-- 'venta' y 'ajuste' los usa la 0002. Los demás son las entradas y
-- salidas que ocurren fuera de una venta.
create type movement_type  as enum ('venta', 'devolucion', 'entrada', 'ajuste', 'merma');

-- =====================================================================
-- 2. PERFILES Y ROLES
-- =====================================================================

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       user_role not null default 'cajero',
  created_at timestamptz not null default now()
);

-- Cada usuario de auth nace con su perfil. Por defecto entra como
-- cajero: al dueño se le sube el rol a mano, nunca al revés.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger t_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- security definer a propósito: si consultara `profiles` con los
-- permisos de quien llama, las políticas que usan is_admin() se
-- llamarían a sí mismas sin fin.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- =====================================================================
-- 3. CATÁLOGO
-- =====================================================================

create table categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  parent_id  uuid references categories(id) on delete set null,
  position   int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_categories_parent on categories(parent_id);

create table products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  category_id uuid references categories(id) on delete set null,
  images      text[] not null default '{}',
  -- Precio de referencia para el catálogo. El que manda al vender es
  -- el de la variante.
  base_price  numeric(12,2) not null default 0 check (base_price >= 0),
  is_featured boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_products_category on products(category_id);
create index idx_products_activo   on products(is_active) where is_active;

-- La unidad real de inventario. Una camiseta negra M y la misma en L
-- son dos filas, cada una con su precio y su stock.
create table product_variants (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references products(id) on delete cascade,
  size                text not null,
  color               text not null,
  sku                 text not null unique,
  barcode             text unique,
  cost_price          numeric(12,2) not null default 0 check (cost_price >= 0),
  sale_price          numeric(12,2) not null default 0 check (sale_price >= 0),
  -- El stock no puede quedar negativo ni por error de programación.
  -- Es la última red por debajo de la validación de create_pos_sale.
  stock               int not null default 0 check (stock >= 0),
  low_stock_threshold int not null default 3 check (low_stock_threshold >= 0),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (product_id, size, color)
);

create index idx_variants_product on product_variants(product_id);
create index idx_variants_barcode on product_variants(barcode);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger t_products_updated
  before update on products
  for each row execute function public.touch_updated_at();

create trigger t_variants_updated
  before update on product_variants
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- 4. CLIENTES
-- doc_type y doc_number entran desde ya, aunque hoy no se usen: la DIAN
-- los exige en la fase 2 y agregarlos después obligaría a perseguir
-- clientes viejos para completarles el dato.
-- =====================================================================

create table customers (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null,
  phone      text,
  email      text,
  address    text,
  doc_type   text,   -- CC, CE, NIT, PP
  doc_number text,
  notes      text,
  created_at timestamptz not null default now()
);

create index idx_customers_phone on customers(phone);
create index idx_customers_doc   on customers(doc_number);

-- =====================================================================
-- 5. VENTAS
-- =====================================================================

create sequence sale_number_seq start 1;

create table sales (
  id          uuid primary key default gen_random_uuid(),
  -- MN-000123. Es el número que va en la tirilla y en el mensaje de
  -- WhatsApp; el uuid no se le enseña a nadie.
  number      text not null unique
                default 'MN-' || lpad(nextval('sale_number_seq')::text, 6, '0'),
  channel     sale_channel not null,
  status      sale_status  not null default 'pendiente',
  customer_id uuid references customers(id) on delete set null,
  cashier_id  uuid references profiles(id),
  subtotal    numeric(12,2) not null default 0,
  discount    numeric(12,2) not null default 0 check (discount >= 0),
  total       numeric(12,2) not null default 0,
  notes       text,
  created_at  timestamptz not null default now(),
  paid_at     timestamptz,
  voided_at   timestamptz,

  -- Fase 2, facturación electrónica. Nacen nulas y así se quedan hasta
  -- que haya RUT. No borrar: el día que se conecte el proveedor, la
  -- lógica de ventas no se toca.
  dian_status   text,
  dian_cufe     text,
  dian_prefix   text,
  dian_number   text,
  dian_response jsonb
);

create index idx_sales_estado  on sales(status);
create index idx_sales_canal   on sales(channel);
create index idx_sales_fecha   on sales(created_at desc);
create index idx_sales_cliente on sales(customer_id);

-- Congela nombre, SKU y precio del momento de la venta. Si mañana sube
-- el precio o se borra la prenda, la factura vieja no se altera: por
-- eso variant_id es nullable y los textos van copiados, no referidos.
create table sale_items (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null references sales(id) on delete cascade,
  variant_id   uuid references product_variants(id) on delete set null,
  product_name text not null,
  sku          text,
  size         text,
  color        text,
  unit_price   numeric(12,2) not null check (unit_price >= 0),
  unit_cost    numeric(12,2) not null default 0 check (unit_cost >= 0),
  quantity     int not null check (quantity > 0),
  discount     numeric(12,2) not null default 0 check (discount >= 0)
);

create index idx_sale_items_sale on sale_items(sale_id);

-- Tabla aparte para permitir pago mixto: parte en efectivo, parte por
-- Nequi. Con una sola columna en `sales` eso no se podría representar.
create table sale_payments (
  id         uuid primary key default gen_random_uuid(),
  sale_id    uuid not null references sales(id) on delete cascade,
  method     payment_method not null,
  amount     numeric(12,2) not null check (amount > 0),
  reference  text,           -- número de aprobación de Nequi o del datáfono
  received   numeric(12,2),  -- con cuánto pagó, solo aplica a efectivo
  change_due numeric(12,2),  -- devuelta
  created_at timestamptz not null default now()
);

create index idx_pagos_sale   on sale_payments(sale_id);
create index idx_pagos_metodo on sale_payments(method);

-- =====================================================================
-- 6. KARDEX
-- Toda entrada o salida de stock deja rastro. Si el stock de una
-- variante no coincide con la suma de sus movimientos, algo se escribió
-- por fuera de las funciones y hay que averiguar qué.
-- =====================================================================

create table inventory_movements (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references product_variants(id) on delete cascade,
  type        movement_type not null,
  quantity    int not null,      -- negativo si sale, positivo si entra
  stock_after int not null,
  sale_id     uuid references sales(id) on delete set null,
  user_id     uuid references profiles(id),
  note        text,
  created_at  timestamptz not null default now()
);

create index idx_mov_variante on inventory_movements(variant_id);
create index idx_mov_fecha    on inventory_movements(created_at desc);
create index idx_mov_venta    on inventory_movements(sale_id);

-- =====================================================================
-- 7. CONFIGURACIÓN DE LA TIENDA
-- Fila única. El número de WhatsApp, la dirección y el pie de la
-- tirilla salen de aquí y de ningún otro lado.
-- =====================================================================

create table store_settings (
  id             boolean primary key default true check (id),
  store_name     text not null default 'Mónaco',
  whatsapp       text,
  address        text,
  schedule       text,
  receipt_footer text,
  updated_at     timestamptz not null default now()
);

-- La fila existe vacía: la llena el dueño desde /configuracion.
insert into store_settings (id) values (true) on conflict (id) do nothing;

create trigger t_settings_updated
  before update on store_settings
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- 8. FUNCIONES DE NEGOCIO
-- Las que faltan aquí (create_pos_sale, adjust_stock) las define la
-- 0002 en su versión definitiva.
-- =====================================================================

-- Lo que llama el POS cuando se dispara la pistola.
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
    and (v.barcode = btrim(p_code) or v.sku = upper(btrim(p_code)))
  limit 1;
$$;

/**
 * Pedido desde el catálogo público.
 *
 * NO descuenta inventario, y eso es deliberado: si lo hiciera,
 * cualquiera podría vaciar el stock visible desde internet sin comprar
 * nada. El stock se mueve cuando el dueño confirma por WhatsApp.
 *
 * p_customer: {"full_name","phone","address","email"}
 * p_items:    [{"variant_id","quantity"}]
 */
create or replace function public.create_web_order(
  p_items    jsonb,
  p_customer jsonb
) returns sales
language plpgsql security definer set search_path = public as $$
declare
  v_sale     sales;
  v_customer uuid;
  v_item     jsonb;
  v_variant  product_variants;
  v_qty      int;
  v_subtotal numeric(12,2) := 0;
  v_tel      text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no tiene productos';
  end if;

  v_tel := btrim(coalesce(p_customer->>'phone', ''));
  if btrim(coalesce(p_customer->>'full_name', '')) = '' or v_tel = '' then
    raise exception 'Hacen falta el nombre y el teléfono para poder contactarte';
  end if;

  -- Si el teléfono ya existe, se reutiliza el cliente en vez de crear
  -- un duplicado en cada pedido.
  select id into v_customer from customers where phone = v_tel limit 1;

  if v_customer is null then
    insert into customers (full_name, phone, address, email)
    values (p_customer->>'full_name', v_tel,
            p_customer->>'address', nullif(p_customer->>'email', ''))
    returning id into v_customer;
  else
    update customers set
      full_name = coalesce(nullif(p_customer->>'full_name', ''), full_name),
      address   = coalesce(nullif(p_customer->>'address', ''), address)
    where id = v_customer;
  end if;

  insert into sales (channel, status, customer_id)
  values ('web', 'pendiente', v_customer)
  returning * into v_sale;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty <= 0 then raise exception 'Cantidad inválida'; end if;

    select * into v_variant from product_variants
    where id = (v_item->>'variant_id')::uuid and is_active;
    if not found then raise exception 'Esa prenda ya no está disponible'; end if;

    -- Se avisa si no alcanza, pero no se reserva nada: entre el pedido
    -- y la confirmación, el mostrador manda.
    if v_variant.stock < v_qty then
      raise exception 'Solo quedan % de % talla %',
        v_variant.stock,
        (select name from products where id = v_variant.product_id),
        v_variant.size;
    end if;

    insert into sale_items (sale_id, variant_id, product_name, sku, size, color,
                            unit_price, unit_cost, quantity)
    values (v_sale.id, v_variant.id,
            (select name from products where id = v_variant.product_id),
            v_variant.sku, v_variant.size, v_variant.color,
            v_variant.sale_price, v_variant.cost_price, v_qty);

    v_subtotal := v_subtotal + (v_variant.sale_price * v_qty);
  end loop;

  update sales set subtotal = v_subtotal, total = v_subtotal
    where id = v_sale.id returning * into v_sale;

  return v_sale;
end $$;

/**
 * El dueño cierra por chat y confirma. Aquí sí se descuenta el stock,
 * con el mismo FOR UPDATE que usa el POS: si la última talla M se
 * vendió en el mostrador mientras se hablaba por WhatsApp, esto falla
 * en vez de dejar el inventario en negativo.
 */
create or replace function public.confirm_web_order(
  p_sale_id uuid,
  p_method  payment_method
) returns sales
language plpgsql security definer set search_path = public as $$
declare
  v_sale    sales;
  v_item    sale_items;
  v_variant product_variants;
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador confirma pedidos web';
  end if;

  select * into v_sale from sales where id = p_sale_id for update;
  if not found then raise exception 'El pedido no existe'; end if;
  if v_sale.status <> 'pendiente' then
    raise exception 'Ese pedido ya está en estado %', v_sale.status;
  end if;

  for v_item in select * from sale_items where sale_id = p_sale_id loop
    if v_item.variant_id is null then
      raise exception 'La prenda "%" ya no existe en el catálogo', v_item.product_name;
    end if;

    select * into v_variant from product_variants
    where id = v_item.variant_id for update;

    if v_variant.stock < v_item.quantity then
      raise exception 'Ya no hay stock de % (talla %, color %). Disponible: %',
        v_item.product_name, v_item.size, v_item.color, v_variant.stock;
    end if;

    update product_variants set stock = stock - v_item.quantity, updated_at = now()
      where id = v_variant.id;

    insert into inventory_movements (variant_id, type, quantity, stock_after, sale_id, user_id)
    values (v_variant.id, 'venta', -v_item.quantity,
            v_variant.stock - v_item.quantity, v_sale.id, auth.uid());
  end loop;

  insert into sale_payments (sale_id, method, amount)
  values (v_sale.id, p_method, v_sale.total);

  update sales set status = 'pagada', paid_at = now(), cashier_id = auth.uid()
    where id = v_sale.id returning * into v_sale;

  return v_sale;
end $$;

-- =====================================================================
-- 9. VISTAS
-- security_invoker: la vista respeta las políticas de quien consulta,
-- no las de quien la creó. Sin esto, una vista se convierte en un hueco
-- por donde se lee lo que RLS estaba tapando.
-- v_catalog y v_labels_pending las crea la 0002.
-- =====================================================================

create view v_low_stock with (security_invoker = true) as
  select v.id, p.name as product, v.sku, v.size, v.color,
         v.stock, v.low_stock_threshold, v.sale_price
  from product_variants v
  join products p on p.id = v.product_id
  where v.is_active and p.is_active and v.stock <= v.low_stock_threshold
  order by v.stock;

create view v_daily_sales with (security_invoker = true) as
  select (s.created_at at time zone 'America/Bogota')::date as dia,
         count(*)::int      as ventas,
         sum(s.total)       as total,
         sum(s.discount)    as descuentos,
         coalesce(sum(i.costo), 0) as costo,
         sum(s.total) - coalesce(sum(i.costo), 0) as margen
  from sales s
  left join lateral (
    select sum(si.unit_cost * si.quantity) as costo
    from sale_items si where si.sale_id = s.id
  ) i on true
  where s.status = 'pagada'
  group by 1
  order by 1 desc;

-- =====================================================================
-- 10. RLS
-- Se activa en todas las tablas. Si algo "no funciona por permisos", se
-- revisa la política; desactivar RLS no es una opción.
-- =====================================================================

alter table profiles            enable row level security;
alter table categories          enable row level security;
alter table products            enable row level security;
alter table product_variants    enable row level security;
alter table customers           enable row level security;
alter table sales               enable row level security;
alter table sale_items          enable row level security;
alter table sale_payments       enable row level security;
alter table inventory_movements enable row level security;
alter table store_settings      enable row level security;

-- --- Perfiles ---
create policy "cada quien ve su perfil" on profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "admin gestiona perfiles" on profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- --- Catálogo público: anon solo ve lo activo ---
create policy "publico lee categorias" on categories
  for select to anon using (is_active);
create policy "publico lee productos" on products
  for select to anon using (is_active);
create policy "publico lee variantes" on product_variants
  for select to anon using (
    is_active and exists (
      select 1 from products p where p.id = product_id and p.is_active
    )
  );

-- --- Staff ---
-- Estas tres las reemplaza la 0002, que le quita la escritura al
-- cajero y se la deja solo al dueño. Van con estos nombres exactos
-- porque la 0002 las borra por nombre.
create policy "staff escribe categorias" on categories
  for all to authenticated using (true) with check (true);
create policy "staff escribe productos" on products
  for all to authenticated using (true) with check (true);
create policy "staff escribe variantes" on product_variants
  for all to authenticated using (true) with check (true);

-- --- Clientes: el cajero sí puede registrarlos ---
create policy "staff gestiona clientes" on customers
  for all to authenticated using (true) with check (true);

-- --- Ventas: se leen desde la app, se escriben solo por función ---
-- Las funciones son security definer, así que se saltan estas
-- políticas. Que no haya política de insert es intencional: obliga a
-- pasar por create_pos_sale y confirm_web_order.
create policy "staff lee ventas" on sales
  for select to authenticated using (true);
create policy "admin corrige ventas" on sales
  for update to authenticated using (public.is_admin());

create policy "staff lee items" on sale_items
  for select to authenticated using (true);
create policy "staff lee pagos" on sale_payments
  for select to authenticated using (true);
create policy "staff lee kardex" on inventory_movements
  for select to authenticated using (true);

-- --- Configuración: el número de WhatsApp lo necesita el catálogo ---
create policy "todos leen configuracion" on store_settings
  for select to anon, authenticated using (true);
create policy "admin edita configuracion" on store_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- 11. PERMISOS DE EJECUCIÓN
-- Postgres le da execute a PUBLIC por defecto en cada función nueva.
-- Aquí se cierra eso: el visitante anónimo solo puede hacer una cosa,
-- crear su pedido.
-- =====================================================================

revoke execute on function public.find_by_barcode(text)                    from public, anon;
revoke execute on function public.confirm_web_order(uuid, payment_method)  from public, anon;
revoke execute on function public.is_admin()                               from public, anon;
revoke execute on function public.handle_new_user()                        from public, anon;
revoke execute on function public.touch_updated_at()                       from public, anon;

grant execute on function public.find_by_barcode(text)                   to authenticated;
grant execute on function public.confirm_web_order(uuid, payment_method) to authenticated;
grant execute on function public.is_admin()                              to authenticated;

-- La única puerta del anónimo.
grant execute on function public.create_web_order(jsonb, jsonb) to anon, authenticated;
