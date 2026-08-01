-- =====================================================================
-- MÓNACO — Migración 0006
--
-- v_labels_pending pedía etiquetas de prendas archivadas: filtraba por
-- `v.is_active` pero nunca por `p.is_active`. La misma clase de olvido
-- que tenía find_by_barcode antes de la 0005. v_low_stock sí lo hacía
-- bien, así que la cola de etiquetas era la única inconsistente.
--
-- Se le pone además security_invoker, que le faltaba: sin eso la vista
-- se consulta con los permisos de quien la creó y no de quien la lee.
-- =====================================================================

drop view if exists v_labels_pending;

create view v_labels_pending with (security_invoker = true) as
  select v.id, p.name as product, v.sku, v.barcode, v.size, v.color,
         v.sale_price, v.stock
  from product_variants v
  join products p on p.id = v.product_id
  where v.is_active
    and p.is_active
    and v.barcode_source = 'interno'
    and not v.label_printed;
