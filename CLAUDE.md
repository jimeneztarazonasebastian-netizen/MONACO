# CLAUDE.md — Mónaco, Tienda de Ropa Deportiva

Documento de contexto del proyecto. Léelo completo antes de escribir código.
Ubicación: raíz del repositorio.

---

## 1. Qué estamos construyendo

Una sola aplicación web que sirve dos frentes del mismo negocio, una tienda de ropa deportiva en Barrancabermeja, Colombia:

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

**Tirilla de 58 mm.** Casi todo CSS, menos la altura del papel:

```css
@page { size: 58mm 210mm; margin: 0; }   /* la altura la reescribe el JS */
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

**No escribas `size: 58mm auto`.** Es CSS **inválido**: la especificación
admite `auto` a solas o una o dos medidas, pero no mezclar una medida con
`auto`. El navegador descarta la regla entera y el papel cae al de por
defecto, A4. Estuvo así desde el principio y no daba ningún error, solo dos
síntomas que no parecían de CSS: la vista previa de impresión tardaba
muchísimo —para pintar una tira de 58 mm el navegador rasteriza páginas de
210 mm de ancho casi vacías, y en el celular se queda en "preparando vista
previa"— y en el rollo se habrían ido 18 cm de papel en blanco por tirilla.
Comprobado contra el CSSOM: `58mm auto` no deja rastro en la regla; `58mm
100mm`, `A4` y `auto` sí.

La altura exacta la escribe `lib/imprimir.ts` justo antes de imprimir,
medida sobre el contenido. **Los botones que imprimen llaman a
`imprimir58mm()`, no a `window.print()`.** Las etiquetas toman la altura de
la más alta y cada una cae en su propia página, con `break-inside: avoid`
para que ninguna salga partida. Hay que medir a la fuerza sacando el bloque
fuera de la pantalla, porque vive en `display:none` y un elemento sin caja
no tiene altura que consultar.

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

## 11. Estado actual

Actualizado el 2026-08-02. **Los siete pasos del plan original están
construidos, probados y publicados.**

**Dónde vive**

| | |
|---|---|
| Código | `C:\Users\Isabel\Desktop\MONACO` |
| Repositorio | `jimeneztarazonasebastian-netizen/MONACO`, rama `main` |
| Supabase | proyecto `ygtlkxwlbxahpqcztxcm` (cuenta del emprendimiento, **no** la personal) |
| Publicado | https://monaco-mauve.vercel.app — redespliega en cada push |

Las llaves están en `.env.local` (fuera del repositorio) y en las variables de
entorno de Vercel. La `service_role` no se usa en ningún lado y no debe
aparecer en el código.

**Módulos terminados**

Autenticación con doble cerradura · CRUD de productos, variantes y categorías
con fotos a Storage · POS con lector de código de barras, pago mixto y tirilla
de 58 mm · turnos de caja con arqueo y movimientos de efectivo · inventario con
stock bajo, cola de etiquetas y kardex · historial de ventas con reimpresión,
anulación y devoluciones parciales · catálogo público con filtros, carrito y
checkout por WhatsApp · bandeja de pedidos web · reportes de cierre, métodos,
márgenes y lo más vendido · configuración de la tienda.

**Migraciones aplicadas**, en `supabase/migrations/`:

`0001` esquema base · `0002` códigos de barras, turnos, precios por variante ·
`0003` cierra permisos que quedaron abiertos · `0004` bucket de imágenes ·
`0005` correcciones del POS · `0006` etiquetas de prendas archivadas ·
`0007` reportes · `0008` anulaciones, devoluciones y caja · `0009` anular con
devoluciones previas · `0010` eslogan · `0011` ocultar costos al público.

---

## 12. Decisiones que no están en ningún otro archivo

Cosas que se decidieron trabajando y que no se deducen leyendo el código:

- **La migración `0001` es una reconstrucción**, no la original: esa se perdió.
  Se reescribió desde la sección 3 de este documento. Si aparece la original,
  compararlas antes de reemplazar nada.
- **Los movimientos de plata son hechos y no se borran.** Si entró al cajón,
  entró; si se devolvió, sale como salida explícita enlazada a su venta.
  Anular una venta no reescribe la historia del efectivo. Este modelo salió de
  corregir un fallo donde el reintegro se contaba dos veces y el efectivo
  esperado se iba a negativo.
- **El stock inicial de una variante entra por `adjust_stock`**, no escrito en
  la fila. La variante nace en cero. Si se escribiera directo, el kardex
  arrancaría sin un movimiento que explique de dónde salieron las prendas.
- **El carrito web se revisa contra la tienda al abrirlo.** Vive en
  localStorage y puede tener días; si una prenda se archivó o se agotó, se
  quita y se le dice al cliente cuál, en vez de reventar al confirmar.
- **El enlace de WhatsApp es un ancla que el cliente pulsa**, no un
  `window.open` desde una respuesta asíncrona: los bloqueadores se comen lo
  segundo y quedaría un pedido registrado que nadie mandó.
- **La ciudad es Barrancabermeja.** Este documento decía Bucaramanga y estaba
  mal.
- **El logo es el archivo del dueño, no se redibuja.** Es un lockup completo:
  monograma, la palabra MÓNACO con su propia tipografía, "tienda de ropa
  deportiva" y "since 2026". **No se recorta, no se redibuja y no se le cambia
  la letra** — solo se escala. Si hace falta otra versión, se le pide a él.
  **Hay dos tintas y las dos las entregó el dueño**; ninguna se generó
  invirtiendo la otra:
  - `public/logo-monaco.png` — trazo **blanco** sobre transparente, para
    pantalla. Componente `LogoMonaco`.
  - `public/logo-monaco-tinta.png` — trazo **negro** sobre transparente, para
    la impresora térmica. Componente `LogoTinta`.

  Ya no queda ningún monograma dibujado a mano: `Logotipo.tsx` se borró y el
  login usa el logo real como el resto del sitio.
- **El JPEG del logo se cambió por PNG transparente porque dejaba un recuadro.**
  El fondo del JPEG era negro puro `#000` y el del sitio es `--negro #0A0A0A`:
  sobre el fondo general casi no se veía, pero `LogoMonaco` también sirve de
  marcador dentro de las tarjetas de producto, que son `--carbon #171719`, y
  ahí el cuadro negro saltaba a la vista.
- **El lienzo del PNG de pantalla se dejó cuadrado a propósito.** El trazo solo
  ocupa la banda central (proporción 1.8), pero recortarlo habría cambiado la
  medida en los ocho sitios que llaman a `LogoMonaco`. El de la térmica sí va
  recortado, y por eso: en un rollo de 58 mm el lienzo cuadrado desperdiciaba
  casi dos centímetros de papel en blanco. Recortar **margen transparente** no
  es recortar el arte; no se tocó un píxel del trazo.
- **Lo que se imprime no lleva `store_name`.** El lockup ya trae la palabra
  MÓNACO dibujada; ponerla otra vez al lado en texto eran dos marcas distintas
  pegadas, el mismo problema que resolvió el `h1` `sr-only` de la portada. El
  eslogan sí se imprime, porque no está en el logo y vive en `store_settings`.
  Consecuencia a tener presente: **si el dueño cambia el nombre en
  configuración, la tirilla seguirá diciendo MÓNACO**, porque viene de la
  imagen. El día que eso importe, hay que pedirle un logo nuevo.
- **Lo que se imprime usa `<img>` y no `next/image`.** El optimizador envuelve
  la etiqueta en un `<span>` con carga diferida, y en una ventana de impresión
  eso sale como una tirilla sin logo.
- **La vista previa y el bloque que imprime comparten el componente
  `Etiqueta`.** Son dos árboles distintos en el DOM —uno visible, otro
  `hidden print:block`— pero un solo diseño. Si cada uno tuviera su copia, la
  previa dejaría de parecerse al papel en cuanto alguien tocara una sola.
- **El zoom de la previa va en un envoltorio, nunca sobre `#etiquetas`.** Una
  transformación sobre el bloque que imprime le cambia el tamaño en el papel:
  las etiquetas saldrían al doble y el código de barras dejaría de medir lo que
  el lector espera.
- **En la portada el `h1` va `sr-only`.** El logo ya trae la palabra MÓNACO con
  su tipografía; repetirla al lado en Archivo era poner dos marcas distintas
  juntas. El título sigue ahí para buscadores y lectores de pantalla.
- **No se habla de "disparar" ni de "pistola".** En una tienda de ropa suena a
  arma. Se dice **escanear** y **el lector**, en la interfaz y en el código.
- **Las variables de Supabase se leen con `.trim()`.** Un espacio pegado por
  error en el panel de Vercel no rompe el cliente —`new URL()` recorta espacios
  por especificación— pero sí rompe `urlImagen()`, y el síntoma es que todas
  las fotos aparecen rotas mientras la base parece estar bien.
- **El eslogan vive en `store_settings`**, como el resto de la identidad.
- **RLS filtra filas, no columnas.** Darle a `anon` una política de lectura
  sobre una tabla le da la fila entera, costos incluidos. Los permisos por
  columna son otra capa (`grant select (columnas)`). Al agregar una columna
  sensible a una tabla que el público lee, revisar el grant.
- **Revocar permisos a `PUBLIC`, no a `anon`.** PostgreSQL concede `EXECUTE` a
  `PUBLIC` en toda función nueva y `anon` hereda de ahí: revocarle a `anon`
  directamente no quita nada.

- **Las fuentes van en `@theme inline`, no en `@theme`.** Con `@theme` a
  secas, Tailwind v4 no emitía `--font-display`, `--font-sans` ni
  `--font-mono` como propiedades CSS reales, así que
  `font-family: var(--font-sans)` quedaba inválido y **todo el sitio corría
  con la fuente del sistema**: Archivo, Manrope e IBM Plex Mono se
  descargaban en cada visita sin usarse, y la tirilla térmica salía en
  proporcional en vez de monoespaciada. Los `--color-*` sí se emitían, y por
  eso el fallo pasó desapercibido: los colores estaban bien y sólo la
  tipografía se veía genérica, sin ningún error. Las reglas escritas a mano
  apuntan ahora directamente a `--fuente-*`, que es lo que inyecta
  `next/font` en el `<body>`.
- **El movimiento vive sólo en `(tienda)`.** Telón de entrada, cursor propio
  y aparición al hacer scroll se montan en el layout del catálogo; el POS
  sigue sin una sola animación, como pide la sección 8. Dos reglas al tocar
  esto: lo que esconde contenido se activa con un `data-` que pone el script
  (sin JavaScript todo se ve, sólo que quieto), y el cursor propio se apaga
  si el puntero no es fino, porque la mayoría del tráfico llega de
  Instagram por celular.
- **El revelado al hacer scroll observa mutaciones del DOM.** Los filtros
  del catálogo reemplazan la rejilla entera sin recargar; si sólo se
  observara una vez, las tarjetas que llegan después nacerían escondidas y
  el filtro parecería no devolver resultados.

**Trampas del entorno (Windows)**

- **No compilar con el servidor de desarrollo encendido**: los dos escriben en
  `.next` y se pisan; el sitio empieza a devolver 500 con errores de
  `_buildManifest`. `npm run lint` y `npx tsc --noEmit` sí son seguros.
- Al detener el servidor, el proceso `node.exe` puede sobrevivir y quedarse con
  el puerto 3000. El servidor nuevo arranca en el 3001 y lo que se prueba en el
  3000 es el proceso viejo. **Comprobar en el log en qué puerto arrancó**, y
  limpiar con `Get-CimInstance Win32_Process | Where CommandLine -like '*MONACO*' | Stop-Process -Force`.
- Verificar por **código de salida**, no por el texto de la consola: encadenar
  con `&&` después de un `grep` deja pasar un build roto.

---

## 13. Lo que falta

**Antes de recibir clientes de verdad**

1. **Probar la tirilla en la impresora térmica**, con márgenes en cero y sin
   encabezado ni pie del navegador. **Mirar de cerca el logo**: el lockup se
   simuló a 203 dpi con umbral de un bit, que es como quema la térmica, y a los
   40 mm de la tirilla el monograma y MÓNACO salen limpios, "tienda de ropa
   deportiva" sale apretada pero legible y **"since 2026" sale emplastada**. En
   las etiquetas, a 26 mm, la línea de "tienda de ropa deportiva" también se
   degrada. Si en papel se ve mal, la salida es **pedirle al dueño el monograma
   suelto**, no recortarle el lockup.
2. **Probar el lector físico**: la lógica se validó con pulsaciones simuladas.
3. **Decidir qué pasa con el catálogo de prueba.** Las 5 prendas ficticias
   existen y ya tienen foto (sección 14). Sirven para enseñar la tienda, pero
   no son mercancía real: antes de vender hay que reemplazarlas por el
   inventario de verdad o archivarlas.

**Mejoras conocidas, ninguna bloquea vender**

- **Realtime**: el catálogo no actualiza el stock solo, hay que recargar. La
  sección 7 lo pide y quedó sin hacer.
- **`generate_sku` puede repetir SKU**: termina en cuatro dígitos de `random()`
  sin reintento y la columna es única. Con volumen, un insert masivo choca. La
  solución es una secuencia, como ya se hace con el código de barras.
- **Las políticas RLS no se han probado con un cajero real.** El 2026-08-02 se
  auditaron contra la base y el resultado es bueno: `anon` no tiene ni una sola
  política de escritura, es `NOLOGIN` y no tiene `bypassrls`; no puede leer
  `cost_price` (falla con *permission denied*, la 0011 aguanta); y todas las
  funciones de admin (`adjust_stock`, `set_product_price`, `set_price_by_size`,
  `void_sale`, `return_sale_items`, `confirm_web_order`) validan `is_admin()`
  **dentro** de la función, que es lo que importa porque son `SECURITY DEFINER`
  y por definición ignoran RLS. Lo que sigue sin probarse es el flujo completo
  con una segunda cuenta de verdad.
- **`customers` deja al staff editar cualquier cliente**: las políticas
  `staff registra clientes` y `staff corrige clientes` son `true`/`true`. Es
  coherente con la regla 5 de la sección 4, pero significa que un cajero puede
  modificar los datos de cualquier cliente, no solo los que él registró.
- **Solo existe un usuario**, el dueño. No se ha creado ningún cajero.

**Lo que falta pedirle al dueño**

- Fotos de las prendas.
- **El logo en SVG.** Ya no es urgente —hay PNG transparente en las dos tintas
  y no queda nada dibujado a mano—, pero el archivo de la térmica tiene 640 px
  de ancho y un vectorial imprimiría más nítido y pesaría menos.
- **El monograma suelto, sin la palabra ni las líneas de texto**, por si la
  microtipografía del lockup no aguanta la térmica (punto 1 de arriba).
- Confirmar si las prendas del primer lote traen código de barras de fábrica.

---

## 14. Qué hay hoy en la base

Verificado contra la base el 2026-08-03. **Ojo: este apartado ya estuvo
desactualizado dos veces.** La primera decía que las prendas de prueba se
habían borrado cuando se habían vuelto a crear. La segunda arrastró dos frases
de esa versión vieja que ya no eran ciertas: que el catálogo público estaba
vacío, y que solo una prenda tenía movimiento de entrada en el kardex. **Si vas
a decidir algo con esto, consúltalo contra la base primero.**

- **5 prendas activas, cada una con una foto real subida a Storage**: Camiseta
  Dry Fit (4 variantes), Pantaloneta Running (4), Licra Cintura Alta (8), Top
  Deportivo (8) y Gorra Entreno (1). **Son inventadas**, se crearon para poder
  enseñar la tienda. Los originales de las fotos están en
  `Imagenes de catalogo/`.
- **"Camiseta de colombia"**, archivada, con foto y 20 unidades. La creó el
  dueño probando.
- **Tres categorías reales**: Hombre, Mujer, Accesorios.
- **Una venta**, `MN-000009`, de $139.800, y **un turno de caja abierto** desde
  el 2026-08-01 con base $0. Residuo de pruebas. Mientras el turno siga
  abierto, toda venta entra en él.
- **Cero clientes y cero movimientos de caja.**
- **25 etiquetas pendientes** de imprimir y **6 variantes en stock bajo**.

**El catálogo público muestra las 5 prendas**: `v_catalog` devuelve 5 filas.

**El kardex está completo y cuadra**: 26 movimientos de entrada por 181
unidades —uno por variante, incluidas las de prueba— menos las 2 de la venta,
igual a las 179 unidades que hay hoy en stock. Esta vez el stock de las prendas
ficticias sí entró por `adjust_stock` y no escrito en la fila.

**Siguen en fase de pruebas y piensan vaciar todo otra vez antes de cargar
inventario real.** Para dejar la base en cero de verdad, incluido lo de arriba:

```sql
delete from sales;                        -- arrastra items, pagos y devoluciones
delete from products;                     -- arrastra variantes y su kardex
delete from cash_movements;
delete from cash_sessions;
delete from customers;
-- las categorías se conservan: son reales, no de prueba
```

Ojo con el orden y con las llaves foráneas: `inventory_movements.sale_id` y
`cash_movements.sale_id` son `ON DELETE SET NULL`, no cascada. Borrar una venta
deja vivos sus movimientos, huérfanos y sin venta asociada. Eso es coherente con
la sección 12 (los movimientos de plata son hechos), pero si lo que quieres es
una base limpia hay que borrarlos aparte.

**Al recargar inventario real, el stock inicial entra por `adjust_stock`**, no
escrito en la fila. La primera versión del seed lo escribía directo y las
prendas quedaban con stock sin un solo movimiento que lo explicara; el seed
actual ya lo hace bien y por eso el kardex de hoy cuadra. Volver a escribirlo
directo con mercancía real deja el kardex mintiendo desde el primer día.
