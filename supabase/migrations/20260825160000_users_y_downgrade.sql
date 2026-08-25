-- Migración: alta automática en public.users y baja de plan ordenada
--
-- Dos huecos detectados en la auditoría.
--
-- Es idempotente: se puede correr más de una vez sin efecto adicional.

begin;

-- ===========================================================================
-- 1. Fila en public.users para cada cuenta
-- ===========================================================================
--
-- Nada en el código inserta en esta tabla: sólo lee y actualiza. Había dos
-- cuentas sin fila, y una cuenta sin fila no puede solicitar cambio de plan
-- —la FK de plan_requests la rechaza—, no aparece en el panel de usuarios y no
-- tiene rol asignado.
--
-- Va por trigger y no desde la aplicación por la misma razón que las novedades:
-- las cuentas de Google las crea Supabase Auth sin pasar por código nuestro.

create or replace function public.crear_fila_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (uid, email, business_name, role, status)
  values (
    new.id::text,
    new.email,
    new.raw_user_meta_data ->> 'nombre',
    'admin',      -- rol de dueño de comercio; 'super_admin' se asigna a mano
    'active'
  )
  on conflict (uid) do nothing;

  return new;
exception when others then
  -- Crear la fila auxiliar nunca puede impedir que alguien se registre.
  return new;
end;
$$;

drop trigger if exists users_alta_automatica on auth.users;
create trigger users_alta_automatica
  after insert on auth.users
  for each row execute function public.crear_fila_usuario();

-- Cuentas que ya quedaron sin fila.
insert into public.users (uid, email, business_name, role, status)
select u.id::text,
       u.email,
       u.raw_user_meta_data ->> 'nombre',
       'admin',
       'active'
  from auth.users u
 where not exists (select 1 from public.users pu where pu.uid = u.id::text)
   and u.email is not null
on conflict (uid) do nothing;

-- ===========================================================================
-- 2. Baja de plan: desactivar el excedente
-- ===========================================================================
--
-- Al bajar de plan, los productos que exceden el límite nuevo quedaban activos
-- y visibles. El trigger de límites bloquea altas y reactivaciones, pero no
-- corrige lo que ya estaba: el comercio seguía publicando 200 productos en un
-- plan de 5.
--
-- Se desactivan los excedentes en vez de borrarlos: el comerciante no pierde
-- su trabajo y los recupera al volver a subir de plan.

create or replace function public.ajustar_productos_por_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  limite integer;
begin
  if new.plan is not distinct from old.plan then
    return new;
  end if;

  limite := public.limite_productos_plan(new.plan::text);

  -- Se conservan activos los primeros según el orden que definió el dueño:
  -- es su propio criterio de prioridad, y desactivar por fecha o por id sería
  -- arbitrario.
  update public.productos p
     set disponible = false
   where p.comercio_id = new.id
     and p.disponible = true
     and p.id not in (
       select p2.id
         from public.productos p2
        where p2.comercio_id = new.id
          and p2.disponible = true
        order by p2.orden, p2.created_at
        limit limite
     );

  return new;
end;
$$;

drop trigger if exists comercios_ajuste_plan on public.comercios;
create trigger comercios_ajuste_plan
  after update of plan on public.comercios
  for each row execute function public.ajustar_productos_por_plan();

commit;

-- ---------------------------------------------------------------------------
-- Verificación posterior
-- ---------------------------------------------------------------------------
--
-- 1) Ninguna cuenta sin fila:
--
--    select count(*) from auth.users u
--     where not exists (select 1 from public.users pu where pu.uid = u.id::text);
--    -- 0
--
-- 2) El trigger de alta funciona: crear una cuenta de prueba desde la
--    aplicación y verificar que aparece en public.users con role='admin'.
--
-- 3) La baja de plan desactiva el excedente. Sobre un comercio de prueba con
--    varios productos activos:
--
--    update public.comercios set plan = 'basico' where id = '<comercio>';
--    select count(*) from public.productos
--     where comercio_id = '<comercio>' and disponible = true;   -- 5
--
--    Los desactivados siguen existiendo: al volver a 'pro' hay que
--    reactivarlos a mano, porque el sistema no puede saber cuáles quería.
--
-- 4) El trigger sólo actúa cuando cambia el plan. Los comercios que YA están
--    por encima de su límite —por bajas anteriores a esta migración— no se
--    corrigen solos. Para verlos:
--
--    select c.nombre, c.plan,
--           count(*) filter (where p.disponible) as activos,
--           public.limite_productos_plan(c.plan::text) as limite
--      from public.comercios c
--      join public.productos p on p.comercio_id = c.id
--     group by c.id, c.nombre, c.plan
--    having count(*) filter (where p.disponible) > public.limite_productos_plan(c.plan::text);
--
--    Y para ordenarlos todos de una vez, aplicando el mismo criterio que el
--    trigger (se conservan los primeros según el orden del dueño):
--
--    update public.productos p
--       set disponible = false
--      from public.comercios c
--     where p.comercio_id = c.id
--       and p.disponible = true
--       and p.id not in (
--         select p2.id from public.productos p2
--          where p2.comercio_id = c.id and p2.disponible = true
--          order by p2.orden, p2.created_at
--          limit public.limite_productos_plan(c.plan::text)
--       );
--
--    Conviene correr primero la consulta de diagnóstico y avisarle a los
--    comercios afectados antes de despublicarles productos.
