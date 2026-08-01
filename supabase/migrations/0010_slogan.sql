-- =====================================================================
-- MÓNACO — Migración 0010
-- Eslogan de la tienda.
--
-- Va en store_settings y no escrito en el código, como el resto de la
-- identidad: encabeza la tirilla, las etiquetas y la portada del
-- catálogo, y el dueño tiene que poder cambiarlo sin tocar nada.
-- =====================================================================

alter table store_settings
  add column if not exists slogan text;

update store_settings
set slogan = coalesce(slogan, 'Entrena en serio')
where id = true;
