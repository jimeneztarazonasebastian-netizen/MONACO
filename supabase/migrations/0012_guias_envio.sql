-- Guías de envío para los pedidos del catálogo web.
--
-- El pedido web se cierra por WhatsApp y buena parte se despacha por
-- mensajería nacional (Interrapidísimo, Servientrega, Coordinadora). Sin
-- un sitio donde anotar la transportadora y el número de guía, ese dato
-- vive en la conversación de WhatsApp y se pierde: cuando el cliente
-- pregunta "¿ya salió lo mío?" hay que buscar el chat.
--
-- Dos columnas y nada más. No se crea una tabla de envíos porque hoy hay
-- un envío por venta como mucho; si algún día se parte un pedido en dos
-- despachos, esto se mueve a su propia tabla.

alter table sales
  add column if not exists shipping_carrier text,
  add column if not exists tracking_number  text;

comment on column sales.shipping_carrier is
  'Empresa de mensajería que lleva el pedido. Texto libre: el listado de transportadoras cambia y no vale la pena un enum.';

comment on column sales.tracking_number is
  'Número de guía que le sirve al cliente para rastrear. Se le manda por WhatsApp desde la bandeja de pedidos.';

-- Buscar un pedido por su guía cuando el cliente escribe reclamando. El
-- índice es parcial: la enorme mayoría de las ventas son de mostrador y
-- nunca tendrán guía, y no tiene sentido indexar esos nulos.
create index if not exists sales_tracking_number_idx
  on sales (tracking_number)
  where tracking_number is not null;

-- Las políticas de `sales` ya cubren esto: `staff lee ventas` (select) y
-- `admin corrige ventas` (update con is_admin()). No hace falta tocar
-- RLS, y `anon` no tiene ninguna política de lectura sobre `sales`, así
-- que la dirección y la guía del cliente no quedan expuestas al público.
