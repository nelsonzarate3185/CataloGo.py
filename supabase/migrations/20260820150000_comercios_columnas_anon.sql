-- Migración: restringir columnas de comercios para el visitante anónimo
--
-- Continuación de 20260820140000_comercios_lectura_publica.sql, que agregó la
-- política de lectura.
--
-- ORDEN OBLIGATORIO: correr esta migración SÓLO después de que el código nuevo
-- esté desplegado en producción. El catálogo anterior seleccionaba `plan`, que
-- acá no se concede; si se corre antes, la consulta falla con permiso denegado
-- y el catálogo vuelve a responder 404.
--
-- Para verificar que el código nuevo está vivo antes de correr esto:
--   GET https://<tu-dominio>/api/resenas
--   Debe responder 405 (Method Not Allowed), no 404. La ruta sólo existe en el
--   código nuevo.
--
-- Es idempotente: se puede correr más de una vez sin efecto adicional.

begin;

-- RLS filtra filas, no columnas: sin esto el anónimo puede leer user_id, plan y
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
-- Verificación posterior
-- ---------------------------------------------------------------------------
--
-- 1) El anónimo ve sólo las columnas concedidas:
--
--    select column_name, privilege_type
--      from information_schema.column_privileges
--     where table_schema='public' and table_name='comercios' and grantee='anon'
--     order by column_name;
--
--    Se esperan 8 filas. No deben aparecer user_id, plan ni plan_expira_at.
--
-- 2) El catálogo público sigue cargando. Abrirlo en una ventana de incógnito.
--    Si vuelve a dar 404, el código desplegado todavía pide una columna no
--    concedida: revertir con
--
--      grant select on public.comercios to anon;
--
--    y revisar qué columnas selecciona el código en producción.
