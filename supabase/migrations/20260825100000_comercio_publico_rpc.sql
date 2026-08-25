-- Migración: lectura del comercio para el catálogo público, sin importar la sesión
--
-- Problema: la política "comercios: lectura pública activos" es `to anon`. Un
-- usuario autenticado que no sea el dueño —el superadmin usando "Ver tienda",
-- o un comerciante mirando otra tienda— quedaba sin fila y el catálogo
-- respondía 404. Un catálogo público tiene que ser público para todos.
--
-- No se resuelve extendiendo la política a `authenticated`: ese rol tiene grant
-- sobre todas las columnas de `comercios` porque el dueño necesita ver las
-- suyas, así que abrirle la lectura de comercios ajenos expondría user_id,
-- plan y plan_expira_at de la competencia. Los permisos por columna son por
-- rol, no por fila, así que no se puede recortar sólo para lo ajeno.
--
-- La salida es una función security definer que devuelve exactamente las
-- columnas públicas: omite RLS por dentro y no puede filtrar nada más, porque
-- lo demás no forma parte de lo que devuelve.
--
-- Es idempotente: se puede correr más de una vez sin efecto adicional.

begin;

create or replace function public.comercio_publico(p_slug text)
returns table (
  id uuid,
  slug text,
  nombre text,
  descripcion text,
  logo_url text,
  whatsapp text,
  direccion text,
  horario_atencion text,
  maps_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.slug, c.nombre, c.descripcion, c.logo_url,
         c.whatsapp, c.direccion, c.horario_atencion, c.maps_url
    from public.comercios c
   where c.slug = p_slug
     and c.activo = true;
$$;

-- El catálogo lo abre cualquiera, con sesión o sin ella.
grant execute on function public.comercio_publico(text) to anon, authenticated;

commit;

-- ---------------------------------------------------------------------------
-- NOTA SOBRE COLUMNAS NUEVAS
-- ---------------------------------------------------------------------------
--
-- Esta función enumera columnas. Una columna nueva de `comercios` que el
-- catálogo público necesite hay que agregarla acá además del `grant` a `anon`,
-- o no llegará a la vista del comprador.
--
-- ---------------------------------------------------------------------------
-- Verificación posterior
-- ---------------------------------------------------------------------------
--
-- 1) Devuelve la fila para un slug activo:
--
--    select * from public.comercio_publico('ngo-saeca-nb7k');
--
-- 2) No devuelve nada para un comercio dado de baja ni para un slug inexistente:
--
--    select count(*) from public.comercio_publico('no-existe');   -- 0
--
-- 3) Las demás tablas del catálogo deben permitir lectura a `authenticated`,
--    no sólo a `anon`. Revisar que sus políticas apunten al rol `public` y no
--    a `anon`:
--
--    select tablename, policyname, cmd, roles
--      from pg_policies
--     where schemaname='public'
--       and tablename in ('catalogos','categorias','productos','resenas')
--     order by tablename, cmd;
--
--    Si alguna dijera `{anon}`, tendría el mismo problema que tenía comercios:
--    el catálogo cargaría vacío para un usuario con sesión.
--
-- 4) La prueba real: abrir un catálogo con sesión de superadmin iniciada.
