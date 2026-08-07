-- =====================================================================
-- MÓNACO — Migración 0013
-- Pone bajo control de versiones la red que activa RLS sola.
-- =====================================================================
--
-- EL PROBLEMA
--
-- En la base hay un event trigger llamado `ensure_rls`, conectado a la
-- función `public.rls_auto_enable()`. Cada vez que se crea una tabla en
-- el esquema `public`, le activa Row Level Security automáticamente.
--
-- Es una red de seguridad, y buena: hoy las 13 tablas tienen RLS puesto
-- en parte gracias a ella.
--
-- Pero no estaba en ninguna migración. Se creó a mano contra la base y
-- ahí se quedó. Eso significa que una base reconstruida desde este
-- repositorio —entorno de pruebas, recuperación, proyecto nuevo— NO
-- tendría la red. Y entonces una tabla creada más adelante nacería sin
-- RLS, sin que ningún linter avise en el momento y sin que nadie lo note
-- hasta que alguien lea la tabla desde fuera.
--
-- El riesgo no es que la función sea atacable (no lo es, ver abajo).
-- El riesgo es que la protección desaparezca sin ruido.
--
--
-- SOBRE EL AVISO DEL LINTER
--
-- El linter reporta `rls_auto_enable` como "ejecutable por anon". Es un
-- falso positivo: la función devuelve `event_trigger`, y PostgreSQL se
-- niega a invocarla directamente sin importar los permisos.
--
--   select public.rls_auto_enable();
--     ERROR: trigger functions can only be called as triggers
--
--   POST /rest/v1/rpc/rls_auto_enable  (con la clave anónima)
--     HTTP 400 — cannot display a value of type event_trigger
--
-- Aun así se le quitan los permisos sobrantes más abajo, por higiene y
-- para que el linter deje de reportarlo. Los event triggers los dispara
-- el motor con los privilegios de su dueño; no consultan el EXECUTE del
-- llamante, así que quitarlo no rompe la red.
--
-- Nota histórica: el `LEEME.md` decía que esta función era "de la
-- plataforma de Supabase" y que no se tocaba. No lo es. Los event
-- triggers de Supabase pertenecen a `supabase_admin`; `ensure_rls`
-- pertenece a `postgres`, no está en ninguna extensión, y no aparecía en
-- ninguna migración. Se creó en este proyecto.
--
--
-- Esta migración es idempotente: aplicarla sobre la base actual, donde
-- todo esto ya existe, no cambia nada.
-- =====================================================================


-- =====================================================================
-- 1. LA FUNCIÓN
--
-- Copia literal de lo que hoy vive en la base. `search_path` fijado a
-- pg_catalog para que una tabla o función con nombre malicioso en otro
-- esquema no pueda secuestrar las llamadas de dentro.
-- =====================================================================

create or replace function public.rls_auto_enable()
  returns event_trigger
  language plpgsql
  security definer
  set search_path to 'pg_catalog'
as $function$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name is not null
       and cmd.schema_name in ('public')
       and cmd.schema_name not in ('pg_catalog', 'information_schema')
       and cmd.schema_name not like 'pg_toast%'
       and cmd.schema_name not like 'pg_temp%'
    then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          -- No se aborta la creación de la tabla si el ALTER falla: es
          -- preferible una tabla creada y avisada en el log que un
          -- CREATE TABLE que revienta por culpa de la red.
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    else
      raise log 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)',
        cmd.object_identity, cmd.schema_name;
    end if;
  end loop;
end;
$function$;


-- =====================================================================
-- 2. EL EVENT TRIGGER
--
-- No existe `create event trigger if not exists`, así que se borra y se
-- vuelve a crear. Entre las dos sentencias no se crean tablas, de modo
-- que no hay ventana real sin protección.
-- =====================================================================

drop event trigger if exists ensure_rls;

create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();


-- =====================================================================
-- 3. PERMISOS
--
-- Como ya se aprendió en la 0003: PostgreSQL concede EXECUTE a PUBLIC en
-- toda función nueva, y `anon` lo hereda de ahí. Revocar solo a `anon`
-- no quita nada, hay que revocar a PUBLIC primero.
-- =====================================================================

revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;

-- service_role tampoco la necesita: la red la dispara el motor, no un
-- cliente de la API.
revoke execute on function public.rls_auto_enable() from service_role;


-- =====================================================================
-- COMPROBACIÓN (manual, no se ejecuta sola)
--
-- Para confirmar que la red sigue funcionando después de aplicar esto:
--
--   create table public._prueba_rls (id int);
--   select relrowsecurity from pg_class
--     where oid = 'public._prueba_rls'::regclass;   -- debe dar true
--   drop table public._prueba_rls;
--
-- Y que el linter ya no reporte la función:
--   Dashboard → Advisors → Security
-- =====================================================================
