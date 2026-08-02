-- =====================================================================
-- MÓNACO — Migración 0011
--
-- El visitante anónimo podía leer `product_variants.cost_price`.
--
-- La política "publico lee variantes" le da acceso a la fila, y RLS
-- filtra filas, no columnas: con la llave publicable —que viaja en el
-- navegador de cualquier visitante— bastaba pedir
-- /rest/v1/product_variants?select=cost_price para sacar el costo de
-- cada prenda y calcular el margen de la tienda.
--
-- La política estaba bien pensada; lo que faltaba era el permiso por
-- columna, que en PostgreSQL es una capa distinta de RLS.
-- =====================================================================

revoke select on product_variants from anon;

-- Solo lo que el catálogo necesita para pintar una prenda y saber si
-- hay talla disponible. Ni costos, ni SKU, ni umbrales de aviso.
grant select (
  id,
  product_id,
  size,
  color,
  sale_price,
  stock,
  is_active
) on product_variants to anon;

-- Por la misma razón: `products` tampoco necesita exponerlo todo, pero
-- ahí no hay nada sensible. Se deja como está y queda anotado.
