-- =====================================================================
-- MÓNACO — Migración 0004
-- Bucket de imágenes de producto.
-- =====================================================================

-- Público en lectura: las fotos las tiene que ver cualquiera que entre
-- al catálogo, sin sesión. Escribir es otra cosa y queda al dueño.
--
-- 5 MB por archivo. Las fotos salen del celular con 4 o 5 MB, así que
-- por debajo de eso empezaría a rebotar lo normal; muy por encima, el
-- catálogo se vuelve lento en datos móviles, que es como llega la
-- mayoría del tráfico desde Instagram.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'productos', 'productos', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

drop policy if exists "publico ve imagenes de producto" on storage.objects;
drop policy if exists "admin sube imagenes"            on storage.objects;
drop policy if exists "admin reemplaza imagenes"       on storage.objects;
drop policy if exists "admin borra imagenes"           on storage.objects;

create policy "publico ve imagenes de producto" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'productos');

create policy "admin sube imagenes" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'productos' and public.is_admin());

create policy "admin reemplaza imagenes" on storage.objects
  for update to authenticated
  using (bucket_id = 'productos' and public.is_admin())
  with check (bucket_id = 'productos' and public.is_admin());

create policy "admin borra imagenes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'productos' and public.is_admin());
