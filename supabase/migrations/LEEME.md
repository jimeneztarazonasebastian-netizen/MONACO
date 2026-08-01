# Migraciones

## Falta la 0001

Aquí solo está la **0002**. La migración base — `0001_monaco_schema.sql`, la que
crea `profiles`, `categories`, `products`, `product_variants`, `customers`,
`sales`, `sale_items`, `sale_payments`, `inventory_movements`,
`store_settings`, el helper `public.is_admin()` y los enums
`payment_method` y `movement_type` — no está en el repositorio.

La 0002 **no corre sola**: modifica tablas que crea la 0001 y llama a
`is_admin()`. Hay que recuperarla antes de levantar cualquier base.

Dónde puede estar:

- En el chat donde se escribió originalmente.
- En el proyecto de Supabase donde se aplicó, si ese proyecto todavía existe
  (`supabase db dump` la reconstruye a partir del esquema vivo).

Si no aparece, se puede reescribir a partir de la sección 3 del `CLAUDE.md`,
que describe todas las tablas y funciones. Pero es preferible recuperar la
original antes que reinventarla.

## Extensiones que exige la 0002

Verificar que la 0001 las cree; si no, hay que agregarlas antes:

```sql
create extension if not exists pgcrypto;  -- gen_random_uuid()
create extension if not exists unaccent;  -- generate_sku()
```

Sin `unaccent` el trigger `t_variant_defaults` falla al insertar la primera
variante sin SKU.

## Cosas anotadas para una futura 0003

No son urgentes, pero conviene no olvidarlas:

1. **`generate_sku` puede repetir SKU.** Termina en 4 dígitos de `random()`
   sin reintento ni verificación. Si `sku` tiene índice único, tarde o
   temprano un insert masivo va a chocar. La solución es una secuencia, igual
   que ya se hace con el código de barras.
2. **El arqueo no contempla salidas de caja.** `close_cash_session` calcula
   `expected_amount = base + efectivo vendido`. Si alguien saca plata de la
   caja para un domicilio o un gasto, el faltante se lo carga el cajero.
   Cuando eso pase en el local, toca una tabla `cash_movements`.
3. **`create_pos_sale` no valida que `p_discount` sea positivo**, ni que el
   descuento no supere el subtotal. Un descuento negativo infla el total.
