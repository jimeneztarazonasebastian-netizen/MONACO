# Migraciones

Se aplican **en orden**. La 0002 modifica tablas que crea la 0001, así que
sola no corre.

| Archivo | Qué hace |
|---|---|
| `0001_monaco_schema.sql` | Esquema base: catálogo, variantes, ventas, kardex, RLS y las funciones `create_web_order`, `confirm_web_order`, `find_by_barcode` |
| `0002_barcodes_turnos_precios.sql` | Códigos de barras mixtos, turnos de caja, precios por variante, `create_pos_sale` y `adjust_stock` |

## La 0001 está reconstruida

La original se perdió: solo sobrevivió la 0002. Esta 0001 se reescribió a
partir de la sección 3 del `CLAUDE.md`, cuidando que encaje con lo que la 0002
espera encontrar (el `NOT NULL` de `sku`, los nombres exactos de las políticas
que la 0002 borra, `is_admin()`, los enums).

**Si aparece la original, compárala antes de reemplazar nada.** Puede tener
columnas o índices que el CLAUDE.md no menciona.

## Verificación

Las dos migraciones se probaron contra un PostgreSQL real (PGlite) con una
prueba funcional de 23 comprobaciones: aplican en orden y la lógica de negocio
se comporta como debe — el stock baja al vender y no antes, el cajero no sube
precios ni ajusta inventario, el pedido web no toca el inventario hasta
confirmarse, el arqueo calcula la diferencia, y el dígito verificador de los
EAN-13 generados es correcto.

Dos advertencias sobre esa prueba:

- Se emularon `auth.users`, `auth.uid()` y los roles `anon`/`authenticated`,
  que son de Supabase y no de PostgreSQL.
- **Las políticas RLS no se ejercitaron de verdad.** La prueba corre como
  superusuario, que se salta RLS. Que las políticas se creen sin error no
  demuestra que dejen pasar lo correcto: eso hay que probarlo con usuarios
  reales una vez la base esté arriba.

## Extensiones

La 0001 crea `pgcrypto` y `unaccent`. Sin `unaccent`, el trigger
`t_variant_defaults` de la 0002 falla al insertar la primera variante sin SKU.

## Anotado para una futura 0003

No bloquean nada hoy, pero conviene no olvidarlos:

1. **`generate_sku` puede repetir SKU.** Termina en 4 dígitos de `random()` sin
   reintento, y `sku` tiene índice único. Con volumen, un insert masivo va a
   chocar. La solución es una secuencia, igual que con el código de barras.
2. **El arqueo no contempla salidas de caja.** `close_cash_session` calcula
   `expected_amount = base + efectivo vendido`. Si alguien saca plata para un
   domicilio o un gasto, el faltante se lo carga el cajero. Cuando eso pase en
   el local, toca una tabla `cash_movements`.
3. **`create_pos_sale` no valida `p_discount`.** Un descuento negativo infla el
   total; uno mayor que el subtotal deja la venta en negativo.
4. **Las vistas de la 0002 no tienen `security_invoker`.** Las de la 0001 sí.
   Sin eso, una vista puede dejar leer lo que RLS estaba tapando.
