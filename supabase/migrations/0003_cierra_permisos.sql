-- =====================================================================
-- MÓNACO — Migración 0003
-- Cierra los huecos de seguridad que reportó el linter de Supabase
-- después de aplicar la 0001 y la 0002.
-- =====================================================================

-- =====================================================================
-- 1. EL REVOKE DE LA 0002 NO SERVÍA
--
-- PostgreSQL le concede EXECUTE a PUBLIC en toda función nueva, y el rol
-- `anon` hereda de PUBLIC. Por eso `revoke ... from anon` no quitaba
-- nada: el permiso venía por la herencia, no directo.
--
-- El caso grave era cash_session_summary: no valida nada por dentro, así
-- que un visitante anónimo podía pedir /rest/v1/rpc/cash_session_summary
-- y leer el nombre del cajero, las ventas del turno y cuánto efectivo
-- debería haber en la caja. Las demás se salvaban por sus propias
-- validaciones, pero vivir de eso es apostar.
--
-- Aquí se revoca a PUBLIC, que es lo que de verdad cierra la puerta, y
-- se concede uno por uno a quien corresponde.
-- =====================================================================

revoke execute on function
  public.create_pos_sale(jsonb, jsonb, uuid, numeric, text),
  public.open_cash_session(numeric),
  public.close_cash_session(numeric, text),
  public.cash_session_summary(uuid),
  public.set_product_price(uuid, numeric),
  public.set_price_by_size(uuid, jsonb),
  public.adjust_stock(uuid, int, movement_type, text),
  public.confirm_web_order(uuid, payment_method),
  public.find_by_barcode(text),
  public.is_admin(),
  public.create_web_order(jsonb, jsonb)
from public, anon, authenticated;

-- Personal de la tienda. El control de rol sigue estando dentro de cada
-- función: esto solo decide quién puede siquiera tocar la puerta.
grant execute on function
  public.create_pos_sale(jsonb, jsonb, uuid, numeric, text),
  public.open_cash_session(numeric),
  public.close_cash_session(numeric, text),
  public.cash_session_summary(uuid),
  public.set_product_price(uuid, numeric),
  public.set_price_by_size(uuid, jsonb),
  public.adjust_stock(uuid, int, movement_type, text),
  public.confirm_web_order(uuid, payment_method),
  public.find_by_barcode(text),
  public.is_admin()
to authenticated;

-- La única puerta del visitante anónimo, tal como manda el CLAUDE.md.
grant execute on function public.create_web_order(jsonb, jsonb)
  to anon, authenticated;

-- --- Funciones internas: nadie las llama desde la API ---
revoke execute on function
  public.touch_updated_at(),
  public.variant_defaults(),
  public.handle_new_user()
from public, anon, authenticated;

-- generate_sku, generate_internal_barcode y ean13_check_digit las llama
-- variant_defaults, que NO es security definer: corre con los permisos
-- de quien inserta la variante. Si se les quita el execute sin devolvérselo
-- a `authenticated`, crear una prenda falla con "permission denied".
revoke execute on function
  public.generate_sku(uuid, text, text),
  public.generate_internal_barcode(),
  public.ean13_check_digit(text)
from public, anon;

grant execute on function
  public.generate_sku(uuid, text, text),
  public.generate_internal_barcode(),
  public.ean13_check_digit(text)
to authenticated;

-- El trigger de registro lo dispara el servicio de autenticación, no un
-- usuario. Se le devuelve el permiso solo a ese rol para no romper el
-- alta de usuarios nuevos.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.handle_new_user() to supabase_auth_admin;
  end if;
end $$;

-- =====================================================================
-- 2. VISTAS SIN security_invoker
--
-- Una vista sin esta opción se consulta con los permisos de quien la
-- creó, no de quien la lee: se convierte en un hueco por donde se ve lo
-- que RLS estaba tapando. Las vistas de la 0001 ya la traen; a las de la
-- 0002 les faltaba.
-- =====================================================================

alter view v_catalog        set (security_invoker = true);
alter view v_labels_pending set (security_invoker = true);

-- =====================================================================
-- 3. search_path FIJO EN LAS FUNCIONES QUE NO LO TENÍAN
--
-- Sin search_path fijo, quien llama decide en qué esquema se resuelven
-- los nombres. Con eso se puede colar una función propia que suplante,
-- por ejemplo, a unaccent().
-- =====================================================================

-- unaccent sale de `public` al esquema que Supabase reserva para
-- extensiones. Por eso generate_sku necesita los dos esquemas.
alter extension unaccent set schema extensions;

alter function public.generate_sku(uuid, text, text)  set search_path = public, extensions;
alter function public.generate_internal_barcode()     set search_path = public;
alter function public.ean13_check_digit(text)         set search_path = public;
alter function public.variant_defaults()              set search_path = public;
alter function public.touch_updated_at()              set search_path = public;

-- =====================================================================
-- 4. EL CAJERO NO BORRA CLIENTES
--
-- La política anterior era FOR ALL con USING (true): registrar clientes
-- y borrarlos quedaban al mismo nivel. El CLAUDE.md dice que el cajero
-- puede registrar y consultar, no destruir historia de ventas.
-- =====================================================================

drop policy if exists "staff gestiona clientes" on customers;

create policy "staff lee clientes"      on customers for select to authenticated using (true);
create policy "staff registra clientes" on customers for insert to authenticated with check (true);
create policy "staff corrige clientes"  on customers for update to authenticated
  using (true) with check (true);
create policy "admin borra clientes"    on customers for delete to authenticated
  using (public.is_admin());
