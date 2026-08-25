-- Migración: límites de plan en el servidor y cierre de plan_requests
--
-- Dos correcciones de seguridad detectadas en la auditoría.
--
-- Es idempotente: se puede correr más de una vez sin efecto adicional.

begin;

-- ===========================================================================
-- 1. Límites de plan aplicados en la base
-- ===========================================================================
--
-- Hasta ahora el límite sólo se verificaba en React. La policy de productos es
-- "dueño gestiona ALL", sin ningún control de cantidad, así que un comerciante
-- podía insertar productos sin límite desde la consola del navegador con su
-- propio JWT. El modelo de negocio era evitable.

-- OJO: estos valores duplican PLAN_LIMITES de types/database.ts. No hay una
-- fuente única porque los límites se usan tanto en la UI como acá. Si cambian,
-- hay que tocar los dos lugares.
create or replace function public.limite_productos_plan(p_plan text)
returns integer
language sql
immutable
as $$
  select case p_plan
           when 'basico' then 5
           when 'pro'    then 30
           when 'plus'   then 90
           else 2147483647          -- business: sin límite práctico
         end;
$$;

create or replace function public.validar_limite_productos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  limite integer;
  activos integer;
begin
  -- Sólo interesa cuando un producto pasa a ocupar un lugar: al crearse
  -- disponible, o al reactivarse. Editar nombre o precio, y desactivar, nunca
  -- se bloquean.
  if tg_op = 'INSERT' and new.disponible is not true then
    return new;
  end if;

  if tg_op = 'UPDATE' and not (old.disponible is not true and new.disponible is true) then
    return new;
  end if;

  select public.limite_productos_plan(c.plan::text)
    into limite
    from public.comercios c
   where c.id = new.comercio_id;

  if limite is null then
    return new;
  end if;

  select count(*)
    into activos
    from public.productos p
   where p.comercio_id = new.comercio_id
     and p.disponible = true
     and p.id is distinct from new.id;

  if activos >= limite then
    -- El mensaje llega al comerciante en un toast: tiene que ser accionable.
    raise exception 'Alcanzaste el límite de % productos activos de tu plan. Desactivá otro producto o cambiá de plan.', limite
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists productos_limite_plan on public.productos;
create trigger productos_limite_plan
  before insert or update on public.productos
  for each row execute function public.validar_limite_productos();

-- ===========================================================================
-- 2. plan_requests deja de ser legible por cualquiera
-- ===========================================================================
--
-- La política vigente es `using (true)`: cualquiera en internet podía leer
-- todas las solicitudes de plan, con vendor_id y el JSON de datos incluidos.

drop policy if exists "plan_requests: public read" on public.plan_requests;

-- El dueño ve las suyas; el superadmin, todas. El panel admin usa la service
-- role key y no depende de esta política.
drop policy if exists "plan_requests: lectura propia o admin" on public.plan_requests;
create policy "plan_requests: lectura propia o admin"
  on public.plan_requests for select
  to authenticated
  using (is_super_admin() or vendor_id = auth_uid());

commit;

-- ---------------------------------------------------------------------------
-- Verificación posterior
-- ---------------------------------------------------------------------------
--
-- 1) El límite se aplica. Con un comercio en plan básico que ya tenga 5
--    productos activos, esto debe fallar:
--
--      insert into public.productos (comercio_id, catalogo_id, nombre, precio, disponible)
--      values ('<comercio_basico>', '<catalogo>', 'Prueba límite', 1000, true);
--
--    Y esto debe funcionar, porque no ocupa lugar:
--
--      insert into public.productos (comercio_id, catalogo_id, nombre, precio, disponible)
--      values ('<comercio_basico>', '<catalogo>', 'Prueba inactiva', 1000, false);
--
-- 2) Un comercio que ya esté por encima de su límite (por una baja de plan)
--    debe poder seguir editando y desactivando sus productos. Sólo se le
--    bloquean las altas y las reactivaciones.
--
-- 3) plan_requests ya no es pública:
--
--      select policyname, cmd, roles, qual from pg_policies
--       where schemaname='public' and tablename='plan_requests' order by cmd;
--
--    No debe quedar ninguna fila con qual = 'true'.
--
-- 4) El comerciante sigue viendo su propia solicitud pendiente en
--    /dashboard/configuracion, y el panel admin sigue viendo todas.
