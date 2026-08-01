# Migraciones

Se aplican **en orden**. La 0002 modifica tablas que crea la 0001, así que
sola no corre.

| Archivo | Qué hace |
|---|---|
| `0001_monaco_schema.sql` | Esquema base: catálogo, variantes, ventas, kardex, RLS y las funciones `create_web_order`, `confirm_web_order`, `find_by_barcode` |
| `0002_barcodes_turnos_precios.sql` | Códigos de barras mixtos, turnos de caja, precios por variante, `create_pos_sale` y `adjust_stock` |
| `0003_cierra_permisos.sql` | Cierra los huecos que reportó el linter de Supabase al aplicar las dos anteriores |

Las tres están **aplicadas** en el proyecto `ygtlkxwlbxahpqcztxcm`.

## Por qué existió la 0003

El `revoke ... from anon` de la 0002 no servía para nada. PostgreSQL le
concede `EXECUTE` a `PUBLIC` en toda función nueva, y `anon` hereda de
`PUBLIC`: revocarle a `anon` directamente no toca esa herencia.

El caso grave era `cash_session_summary`, que no valida nada por dentro. Un
visitante anónimo podía pedir `/rest/v1/rpc/cash_session_summary` y leer el
nombre del cajero, las ventas del turno y cuánto efectivo debía haber en la
caja. Las demás funciones se salvaban por sus propias validaciones, pero
depender de eso es apostar.

La regla, para no repetirlo: **revocar siempre a `PUBLIC`, no a `anon`.**

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

## Advertencias que quedan, y por qué se dejan

El linter sigue reportando tres cosas. Ninguna es un defecto:

- **`rls_auto_enable` ejecutable por `anon`.** No es nuestra: es un event
  trigger de la plataforma de Supabase que activa RLS en tablas nuevas. No se
  toca.
- **Funciones `SECURITY DEFINER` ejecutables por `authenticated`.** Es toda la
  arquitectura: la lógica de negocio vive en funciones que el personal llama.
  El control de rol está dentro de cada una.
- **Políticas de `customers` con `WITH CHECK (true)`.** Cualquier miembro del
  personal puede registrar y corregir clientes, que es justo lo que dice el
  CLAUDE.md. Borrar sí quedó reservado al dueño.

## Anotado para una futura 0004

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
