# CLAUDE.md — Mónaco, Tienda de Ropa Deportiva

Documento de contexto del proyecto. Léelo completo antes de escribir código.
Ubicación: raíz del repositorio.

---

## 1. Qué estamos construyendo

Una sola aplicación web que sirve dos frentes del mismo negocio, una tienda de ropa deportiva en Bucaramanga, Colombia:

- **Catálogo público (B2C)**: la gente navega prendas, arma un carrito y al confirmar se abre WhatsApp con el pedido ya redactado. No hay pasarela de pago. La venta se cierra por chat.
- **POS en tienda**: la caja del local físico. Lector de código de barras, cobro, tirilla térmica de 58 mm, cierre de turno.

Los dos comparten el mismo inventario en tiempo real. Si se vende la última talla M en el mostrador, el catálogo web lo refleja de inmediato.

El negocio es un emprendimiento que arranca en 2026. No hay RUT ni facturación electrónica todavía. El presupuesto de infraestructura es cero: todo debe correr en capas gratuitas.

---

## 2. Stack (decisiones cerradas, no reabrir)

| Capa | Elección | Por qué |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript | El catálogo necesita SSR para que Google indexe las prendas; las Server Actions evitan montar un backend aparte |
| Base de datos | Supabase (PostgreSQL) | Relacional, con Realtime y RLS incluidos. Firestore hace sufrir el inventario con variantes |
| Estilos | Tailwind CSS | |
| Estado del carrito | Zustand con persist | Carrito web en localStorage; carrito POS en memoria |
| Imágenes | Supabase Storage | |
| Despliegue | Vercel | |
| Impresión | CSS `@media print` | Sin drivers ni SDK |
| Códigos de barras | JsBarcode en canvas | Solo para imprimir etiquetas |

Nada de librerías de UI pesadas ni de dependencias de pago.

---

## 3. Modelo de datos

Las migraciones están en `supabase/migrations/`. Ya fueron aplicadas al proyecto Supabase.

**Tablas**

- `profiles` — extiende `auth.users`. Campo `role`: `admin` (el dueño) o `cajero` (los trabajadores).
- `categories` — Hombre, Mujer, Accesorios. Soporta jerarquía con `parent_id`.
- `products` — la prenda como concepto: nombre, descripción, categoría, imágenes, `base_price` de referencia.
- `product_variants` — **la unidad real de inventario**: talla + color. Aquí viven `sku`, `barcode`, `cost_price`, `sale_price` y `stock`.
- `customers` — incluye `doc_type` y `doc_number` desde ya porque la DIAN los exige en Fase 2.
- `sales` — cabecera. `channel` es `pos` o `web`; `status` es `pendiente`, `pagada` o `anulada`.
- `sale_items` — congela nombre, SKU y precio al momento de la venta. Si mañana sube el precio, el histórico no se altera.
- `sale_payments` — tabla aparte para permitir pago mixto (parte efectivo, parte Nequi).
- `inventory_movements` — kardex. Toda entrada o salida de stock deja rastro aquí.
- `cash_sessions` — turnos de caja con base inicial, conteo al cierre y diferencia.
- `store_settings` — fila única: número de WhatsApp, dirección, pie de tirilla.

**Regla central del modelo**: el stock nunca vive en `products`, siempre en `product_variants`. Una camiseta negra M y la misma en L son dos filas independientes.

**Funciones RPC (toda la lógica de negocio está aquí, no en el frontend)**

- `create_pos_sale(items, payments, customer_id, discount, notes)` — venta atómica. Exige turno abierto, bloquea las variantes con `FOR UPDATE`, valida stock, descuenta, registra kardex y pagos. Si algo falla, no queda nada a medias.
- `create_web_order(items, customer)` — crea la venta `pendiente` desde el catálogo. **No descuenta stock.** Devuelve el número de pedido para incrustarlo en el mensaje de WhatsApp.
- `confirm_web_order(sale_id, method)` — desde el panel, cuando el pedido se cerró por chat. Ahí sí descuenta.
- `adjust_stock(variant_id, quantity, type, note)` — entradas de mercancía, conteos, mermas. Solo admin.
- `find_by_barcode(code)` — lo que llama el POS cuando dispara la pistola.
- `open_cash_session(opening)` / `close_cash_session(counted, notes)` / `cash_session_summary(session_id)`.
- `set_product_price(product_id, price)` y `set_price_by_size(product_id, jsonb)` — edición de precios en bloque. Solo admin.

**Vistas**: `v_catalog` (con `price_from`, `price_varies`, tallas y colores agregados), `v_low_stock`, `v_labels_pending`, `v_daily_sales`.

---

## 4. Reglas innegociables

1. **Nunca escribas `stock` con un UPDATE directo desde el frontend.** Todo pasa por `create_pos_sale`, `confirm_web_order` o `adjust_stock`. Si escribes stock por fuera, el kardex queda mintiendo y aparece sobreventa.
2. **Toda mutación va en una Server Action** dentro de `src/lib/actions/`. Los componentes cliente no llaman a Supabase para escribir.
3. **RLS está activo en todas las tablas.** El rol `anon` solo lee catálogo activo y solo puede ejecutar `create_web_order`. Si algo "no funciona por permisos", revisa la política antes de desactivar RLS. Nunca la desactives.
4. **Los pedidos web no descuentan inventario.** Si lo hicieran, cualquiera podría vaciar el inventario visible desde el catálogo público sin comprar nada.
5. **El cajero no cambia precios, no crea productos, no ajusta inventario.** Puede vender, consultar y registrar clientes. Puede aplicar descuento pero no vender por encima del precio de lista.
6. **No hay una sola cifra de dinero en `float`.** Siempre `numeric(12,2)` en la base y enteros o strings formateados en el frontend.
7. **Nada de datos quemados.** Ni productos de ejemplo en el código, ni el número de WhatsApp en una constante: sale de `store_settings`.

---

## 5. Estructura de carpetas

```
src/
├─ app/
│  ├─ (tienda)/            # Catálogo público, SSR
│  │  ├─ page.tsx                    # Home
│  │  ├─ catalogo/page.tsx           # Grid + filtros
│  │  ├─ catalogo/[slug]/page.tsx    # Detalle con selector talla/color
│  │  └─ carrito/page.tsx            # Carrito + checkout WhatsApp
│  ├─ (admin)/             # Requiere sesión
│  │  ├─ pos/page.tsx                # Caja
│  │  ├─ productos/…                 # CRUD + variantes
│  │  ├─ inventario/page.tsx         # Kardex, ajustes, stock bajo, etiquetas
│  │  ├─ ventas/…                    # Historial + reimpresión
│  │  ├─ pedidos/page.tsx            # Pedidos web pendientes
│  │  ├─ caja/page.tsx               # Apertura, arqueo y cierre de turno
│  │  └─ configuracion/page.tsx
│  └─ login/page.tsx
├─ components/{ui,tienda,pos,admin}/
├─ lib/
│  ├─ supabase/{client,server,middleware}.ts
│  ├─ actions/{productos,ventas,inventario,pedidos,caja}.ts
│  ├─ whatsapp.ts          # Construye el link wa.me
│  └─ formato.ts           # Pesos colombianos, fechas
├─ store/{carrito,pos}.ts
├─ hooks/{useStockRealtime,useBarcodeScanner}.ts
├─ types/database.ts       # supabase gen types typescript
└─ styles/print-58mm.css
```

---

## 6. Flujos que hay que entender antes de tocarlos

**Venta en el POS**
El cajero abre turno con la base inicial. Dispara la pistola sobre la prenda, `find_by_barcode` devuelve la variante y entra al carrito. Cobra, elige método o combinación de métodos, se llama `create_pos_sale` y se abre la ventana de impresión de la tirilla. Al final del día cuenta el efectivo, el sistema compara contra lo esperado y guarda la diferencia.

**Pedido web**
El cliente arma el carrito en localStorage. En el checkout deja nombre, teléfono y dirección. Se llama `create_web_order`, que devuelve un número tipo `MN-000123`, y con eso se construye el enlace `https://wa.me/<numero>?text=<mensaje>` con el resumen. El pedido aparece en `/pedidos` y el dueño lo confirma cuando cierra la venta por chat.

**Etiquetas**
Si la prenda llega con código de fábrica, se guarda tal cual y se marca `barcode_source = 'fabrica'`. Si no trae, el trigger genera un EAN-13 interno con prefijo 200 (el rango que el estándar reserva para uso dentro de un comercio, no choca con ningún código real) y queda en `v_labels_pending` hasta que se imprima la etiqueta.

---

## 7. Detalles técnicos con trampa

**Lector de código de barras.** No necesita librería. La pistola se comporta como un teclado: escribe los dígitos muy rápido y manda Enter. Se mantiene un input siempre enfocado en la pantalla del POS, se mide el tiempo entre pulsaciones (menos de ~30 ms entre teclas es la pistola, no un humano) y al recibir Enter se consulta. El input debe recuperar el foco tras cada acción, incluso después de cerrar un modal.

**Tirilla de 58 mm.** Solo CSS:

```css
@page { size: 58mm auto; margin: 0; }
@media print {
  body * { visibility: hidden; }
  #tirilla, #tirilla * { visibility: visible; }
  #tirilla {
    position: absolute; left: 0; top: 0;
    width: 58mm; padding: 2mm;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; line-height: 1.3; color: #000;
  }
}
```
En la impresora hay que dejar márgenes en cero y desactivar encabezado y pie del navegador, o salen la URL y la fecha impresas en la tirilla. El ancho útil real ronda los 48 mm: no metas tablas de más de dos columnas.

**Tiempo real.** La página de detalle se suscribe por Realtime a las variantes que muestra y actualiza el stock sin recargar. Pero la garantía de verdad no está ahí: está en el `FOR UPDATE` dentro de `create_pos_sale`. Realtime es comodidad visual, no control de concurrencia.

**Formato de moneda.** Pesos colombianos sin decimales: `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`. Zona horaria `America/Bogota`.

**Idioma.** Toda la interfaz en español. Nombres de variables y funciones en inglés, textos visibles en español.

---

## 8. Dirección visual

La marca ya tiene identidad y el diseño se deriva de ella, no al revés. El logo es un monograma M de trazo continuo, geométrico y anguloso, blanco sobre negro, con la palabra MÓNACO en mayúsculas de tracking muy abierto. Lee a taller de competición, no a boutique.

**Paleta**

```
--negro     #0A0A0A   fondo dominante
--carbon    #171719   superficies elevadas, cards
--humo      #2A2A2E   bordes y divisores
--blanco    #FAFAFA   texto principal y el logo
--gris      #8A8A90   texto secundario, metadatos
--rojo      #D6001C   acento único
```

El rojo sale de la bandera de Mónaco, no de una paleta genérica. Se usa con avaricia: estado agotado, alertas de stock bajo, el botón que confirma una venta, el anillo de foco. Nada más. Si aparece en tres sitios de la misma pantalla, sobra en dos.

**Tipografía**

- Display: **Archivo Expanded**, mayúsculas, tracking amplio. Recoge la geometría ancha del logotipo. Solo en títulos y en el precio grande del POS.
- Cuerpo: **Manrope**. Legible y neutra, sin competir con el display.
- Utilitaria: **IBM Plex Mono** para SKU, códigos de barras, cifras de arqueo y la tirilla. Los números que hay que leer rápido y sin ambigüedad van en monoespaciada.

**Elemento firma**: el corte diagonal a 35°, el mismo ángulo del trazo del monograma. Aparece como bisel en la esquina de las tarjetas de producto, como forma de los badges de talla y como dirección del barrido al pasar el mouse sobre una prenda. Un solo ángulo repetido en todo el sistema, en vez de esquinas redondeadas genéricas. El resto de la interfaz se mantiene callada.

**El POS es lo contrario del catálogo en intención.** El catálogo puede respirar y lucirse. La caja es una herramienta que alguien usa doscientas veces al día de pie: tipografía grande, objetivos táctiles amplios, cero animación, todo alcanzable sin scroll. No apliques ahí el lenguaje editorial de la tienda.

**Piso de calidad**: responsive hasta móvil (la mayoría del tráfico del catálogo llega por Instagram desde celular), foco de teclado visible, `prefers-reduced-motion` respetado, contraste AA sobre fondo negro.

---

## 9. Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # solo servidor, jamás en un componente cliente
NEXT_PUBLIC_SITE_URL=
```

---

## 10. Fase 2: qué no romper

Nada de esto se implementa ahora, pero la base ya está puesta y no debe eliminarse:

- **Facturación electrónica DIAN.** La tabla `sales` tiene `dian_status`, `dian_cufe`, `dian_prefix`, `dian_number` y `dian_response`, todos nulos. `customers` tiene tipo y número de documento. Cuando saquen el RUT se conecta un proveedor tecnológico sin tocar la lógica de ventas.
- **API oficial de WhatsApp.** El checkout actual arma un enlace `wa.me`. Toda esa construcción vive aislada en `lib/whatsapp.ts` para que se pueda cambiar por una llamada a la API de Meta sin tocar el carrito.
- **Segunda caja.** Hoy hay un índice único que permite un solo turno abierto a la vez. Si abren un segundo punto de pago hay que quitarlo y agregar `register_id` a `cash_sessions`.

---

## 11. Estado actual y orden de trabajo

Hecho: esquema de base de datos completo, aplicado en Supabase.

Pendiente, en este orden:

1. Proyecto Next.js, conexión a Supabase, tipos generados.
2. Auth, middleware de sesión, layout de administración. Sin esto no se puede probar nada del POS.
3. CRUD de productos y variantes con carga de imágenes a Storage.
4. POS completo: caja, lector, pago, tirilla, apertura y cierre de turno. Es el módulo que se usa desde el primer día.
5. Catálogo público, filtros y carrito.
6. Checkout a WhatsApp y bandeja de pedidos.
7. Reportes: cierre diario, stock bajo, márgenes.

---

## 12. Lo que falta pedirle al dueño

- Número de WhatsApp de la tienda, dirección y horario para `store_settings`.
- Entre 5 y 10 productos reales con fotos, tallas, colores, costo y precio de venta, para trabajar con datos verdaderos y no con inventos.
- Confirmar si las prendas del primer lote traen código de barras de fábrica.
- El logo en SVG (hoy solo hay PNG) para que escale limpio en la tirilla y en el header.
