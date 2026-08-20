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

-- ---------------------------------------------------------------------------
-- Restricción de columnas para el visitante anónimo
-- ---------------------------------------------------------------------------

-- RLS filtra filas, no columnas: sin esto el anónimo podría leer user_id, plan y
-- plan_expira_at de cualquier comercio activo. Se le concede exactamente lo que
-- el catálogo público necesita y nada más.
--
-- `whatsapp` se incluye deliberadamente: es el canal de pedido y ya viaja en el
-- enlace wa.me que el comprador usa.
--
-- `slug` y `activo` hacen falta porque PostgREST filtra por ellos.
revoke select on public.comercios from anon;
grant select (
  id,
  slug,
  nombre,
  descripcion,
  logo_url,
  whatsapp,
  direccion,
  activo
) on public.comercios to anon;

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
-- 2) El anónimo ve sólo las columnas concedidas:
--
--    select column_name, privilege_type
--      from information_schema.column_privileges
--     where table_schema='public' and table_name='comercios' and grantee='anon'
--     order by column_name;
--
--    Se esperan 8 filas. No deben aparecer user_id, plan ni plan_expira_at.
--
-- 3) Prueba real de lectura como anónimo:
--
--    set local role anon;
--    select id, nombre, slug from public.comercios where slug = 'nelson-5whq';
--    reset role;
--
--    Debe devolver una fila. Si devuelve cero, la política no se aplicó.
--
-- 4) Las tablas que el catálogo embebe también necesitan lectura pública.
--    `catalogos` ya la tiene; verificar que `productos` y `categorias` también:
--
--    select tablename, policyname, cmd, roles
--      from pg_policies
--     where schemaname='public' and tablename in ('productos','categorias')
--     order by tablename;
--
--    Si alguna no tiene política de SELECT para anónimos, el catálogo va a
--    cargar pero sin productos ni categorías.
