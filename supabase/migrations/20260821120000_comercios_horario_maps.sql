-- Migración: horario de atención y ubicación en mapas
--
-- Dos datos que el comprador busca antes de hacer un pedido y que hoy no
-- existen: cuándo atiende el negocio y dónde queda exactamente.
--
-- `horario_atencion` es texto libre y no una estructura por día a propósito.
-- Una estructura de apertura/cierre no expresa "cerrado al mediodía",
-- "sábados hasta agotar stock" ni feriados, y obliga al dueño a encajar su
-- realidad en un formulario. Si más adelante hace falta filtrar por "abierto
-- ahora", ahí sí conviene estructurarlo.
--
-- Es idempotente: se puede correr más de una vez sin efecto adicional.

begin;

alter table public.comercios
  add column if not exists horario_atencion text;

-- Enlace de Google Maps que el comercio pega desde "Compartir". Se guarda
-- aparte de `direccion` porque resuelven cosas distintas: la dirección es
-- legible y sirve para leerla en voz alta, el enlace lleva al punto exacto.
alter table public.comercios
  add column if not exists maps_url text;

comment on column public.comercios.horario_atencion is
  'Horario de atención en texto libre. Se muestra en el catálogo público.';
comment on column public.comercios.maps_url is
  'Enlace de Google Maps al local. Si está vacío, el catálogo busca la dirección en el mapa.';

-- ---------------------------------------------------------------------------
-- Acceso del visitante anónimo
-- ---------------------------------------------------------------------------

-- Las columnas nuevas no heredan el grant por columna: sin esto el catálogo
-- público falla al pedirlas, porque el grant vigente enumera columnas.
grant select (horario_atencion, maps_url) on public.comercios to anon;

commit;

-- ---------------------------------------------------------------------------
-- Verificación posterior
-- ---------------------------------------------------------------------------
--
-- 1) Las columnas existen:
--
--    select column_name from information_schema.columns
--     where table_schema='public' and table_name='comercios'
--       and column_name in ('horario_atencion','maps_url');
--
-- 2) El anónimo puede leerlas. Se esperan diez columnas en total:
--
--    select column_name from information_schema.column_privileges
--     where table_schema='public' and table_name='comercios' and grantee='anon'
--     order by column_name;
--
--    Deben aparecer horario_atencion y maps_url, y seguir sin aparecer
--    user_id, plan ni plan_expira_at.
--
-- 3) El catálogo público sigue cargando en una ventana de incógnito.
