-- Migración: restringir columnas de comercios para el visitante anónimo
--
-- REEMPLAZA a 20260820150000_comercios_columnas_anon.sql, que nunca se aplicó
-- y quedó desactualizado: concedía ocho columnas, y después se agregaron
-- horario_atencion y maps_url. Correr aquel archivo hoy rompería el catálogo
-- público con permiso denegado.
--
-- Problema que resuelve: `anon` tiene por defecto lectura completa de
-- `comercios`, así que cualquier visitante puede leer user_id, plan y
-- plan_expira_at de todos los comercios activos. RLS filtra filas, no columnas.
--
-- Es idempotente y se puede correr con el código actual ya desplegado.

begin;

-- Se revoca todo y se concede sólo lo que el catálogo público consume, en vez
-- de revocar columna por columna: así el resultado no depende de qué permisos
-- había antes.
revoke select on public.comercios from anon;

grant select (
  -- Identificación y búsqueda
  id,
  slug,
  activo,
  -- Presentación
  nombre,
  descripcion,
  logo_url,
  -- Contacto y ubicación
  whatsapp,
  direccion,
  horario_atencion,
  maps_url
) on public.comercios to anon;

commit;

-- ---------------------------------------------------------------------------
-- IMPORTANTE PARA EL FUTURO
-- ---------------------------------------------------------------------------
--
-- A partir de acá el permiso de `anon` sobre `comercios` enumera columnas. Una
-- columna nueva NO hereda ese permiso: si el catálogo público la necesita, hay
-- que agregar su `grant select (columna) on public.comercios to anon;` en la
-- misma migración que la crea.
--
-- Olvidarlo rompe el catálogo en cuanto el código que la pide llega a
-- producción, con un error de permiso que no menciona la columna faltante.
--
-- ---------------------------------------------------------------------------
-- Verificación posterior
-- ---------------------------------------------------------------------------
--
-- 1) El anónimo ve exactamente diez columnas:
--
--    select column_name from information_schema.column_privileges
--     where table_schema='public' and table_name='comercios' and grantee='anon'
--     order by column_name;
--
--    NO deben aparecer: user_id, plan, plan_expira_at, rubro, created_at,
--    updated_at, resenas_moderadas.
--
-- 2) El catálogo público sigue cargando, en una ventana de incógnito, y la
--    sección "Sobre el vendedor" sigue mostrando los datos.
--
-- 3) Si el catálogo falla, revertir con:
--
--      grant select on public.comercios to anon;
--
--    y revisar qué columna pide el código que no está en la lista de arriba.
