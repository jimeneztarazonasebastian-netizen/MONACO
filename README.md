# Mónaco

Catálogo público y POS de tienda, una sola aplicación sobre el mismo inventario.

El contexto completo del proyecto —decisiones, reglas y orden de trabajo— está
en [`CLAUDE.md`](./CLAUDE.md). Léelo antes de escribir código.

## Levantar el proyecto

```bash
npm install
npm run dev
```

Queda en http://localhost:3000.

Sin base de datos configurada la app arranca igual: el catálogo se ve y el
login avisa que falta la conexión. Las rutas de administración quedan
cerradas.

## Configurar la base

1. Copia `.env.example` a `.env.local`.
2. Llena `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Aplica las migraciones de `supabase/migrations/` **en orden**: primero la
   0001, después la 0002. Lee
   [`supabase/migrations/LEEME.md`](./supabase/migrations/LEEME.md).
4. Genera los tipos, que hoy están puestos a mano:

   ```bash
   npx supabase gen types typescript --local > src/types/database.ts
   ```

## Estado

| Paso | Módulo | Estado |
|---|---|---|
| 1 | Proyecto Next.js y conexión a Supabase | Hecho |
| 2 | Auth, middleware de sesión, layout de administración | Hecho |
| 3 | CRUD de productos y variantes | Hecho |
| 4 | POS: caja, lector, pago, tirilla, turno | Hecho |
| 5 | Catálogo público, filtros y carrito | Hecho |
| 6 | Checkout a WhatsApp y bandeja de pedidos | Hecho |
| 7 | Reportes | Hecho |

Los siete pasos del `CLAUDE.md` están construidos.

**Pendiente antes de publicar:** poner el número real de WhatsApp en
Configuración, y regenerar `src/types/database.ts` para que incluya las
funciones de reporte de la migración 0007 (hoy se llaman desde
`src/lib/reportes.ts`, que tiene los tipos escritos a mano).

## Comandos

```bash
npm run dev     # desarrollo
npm run build   # compilar
npm run lint    # revisar
npm test        # pruebas de la lógica (node:test, sin dependencias)
```

**No compiles con el servidor de desarrollo encendido**: los dos escriben en
`.next` y se pisan, y el sitio empieza a devolver 500 con errores de
`_buildManifest`. `npm run lint` y `npx tsc --noEmit` sí son seguros.
