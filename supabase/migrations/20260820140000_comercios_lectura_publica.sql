-- Migración: lectura pública de comercios activos
--
-- CORRIGE UN DEFECTO DE PRODUCCIÓN, no es parte del rediseño.
--
-- `comercios` tenía sólo dos políticas RLS, ambas del dueño ("dueño ve los
-- suyos", "dueño edita los suyos"). No había ninguna de lectura pública, a
-- diferencia de `catalogos`, que sí tiene "lectura pública activos".
--
-- Para un visitante anónimo `auth.uid()` es NULL, así que `user_id = auth.uid()`
-- nunca es verdadero, RLS filtraba la fila y el catálogo público respondía 404.
-- El comercio existía y estaba activo: simplemente nadie sin sesión podía verlo.
--
-- Efecto: ningún comprador pudo ver nunca un catálogo. El dueño sí lo veía
-- porque el middleware refresca su sesión también en /c/*, lo que enmascaró el
-- problema durante todo el desarrollo.
--
-- Sólo agrega la política. La restricción de columnas para el visitante anónimo
-- va en una migración posterior, a propósito: revocar columnas mientras el
-- código viejo sigue desplegado rompe el catálogo de nuevo, porque ese código
-- selecciona `plan`. Separarlas elimina la dependencia con el orden del deploy.
--
-- Es idempotente: se puede correr más de una vez sin efecto adicional.

begin;

-- ---------------------------------------------------------------------------
-- Política de lectura pública
-- ---------------------------------------------------------------------------

-- Sólo `to anon`, no `to authenticated`, a propósito. Un comerciante con sesión
-- tiene grant de SELECT sobre todas las columnas de la tabla, así que abrirle la
-- lectura de comercios ajenos le expondría user_id, plan y plan_expira_at de la
-- competencia. La regla de aislamiento entre tenants pesa más que el caso raro
-- de un comerciante logueado mirando la tienda de otro.
drop policy if exists "comercios: lectura pública activos" on public.comercios;
create policy "comercios: lectura pública activos"
  on public.comercios for select
  to anon
  using (activo = true);

commit;

-- ---------------------------------------------------------------------------
-- Verificación posterior — correr aparte y revisar la salida
-- ---------------------------------------------------------------------------
--
-- 1) La política existe y apunta a anon:
--
--    select policyname, cmd, roles, qual
--      from pg_policies
--     where schemaname='public' and tablename='comercios'
--     order by policyname;
--
-- 2) Prueba real de lectura como anónimo:
--
--    set local role anon;
--    select id, nombre, slug from public.comercios where slug = 'nelson-5whq';
--    reset role;
--
--    Debe devolver una fila. Si devuelve cero, la política no se aplicó.
--
-- 3) Las tablas que el catálogo embebe también necesitan lectura pública.
--    `catalogos` ya la tiene; verificar que `productos` y `categorias` también:
--
--    select tablename, policyname, cmd, roles
--      from pg_policies
--     where schemaname='public' and tablename in ('productos','categorias')
--     order by tablename;
--
--    Si alguna no tiene política de SELECT para anónimos, el catálogo va a
--    cargar pero sin productos ni categorías.
