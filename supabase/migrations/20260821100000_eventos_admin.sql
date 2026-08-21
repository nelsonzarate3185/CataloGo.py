-- Migración: registro de novedades para el superadmin
--
-- Avisa de dos eventos distinguibles: se creó una cuenta y se creó una tienda.
-- La diferencia importa porque muestra cuánta gente se registra y abandona sin
-- llegar a armar su catálogo.
--
-- Se implementa con triggers y no desde la aplicación porque las cuentas de
-- Google las crea Supabase Auth directamente, sin pasar por ningún código
-- nuestro: enganchado en el formulario de registro, esas altas nunca quedarían
-- registradas.
--
-- Es idempotente: se puede correr más de una vez sin efecto adicional.

begin;

-- ---------------------------------------------------------------------------
-- Tabla
-- ---------------------------------------------------------------------------

create table if not exists public.eventos_admin (
  id uuid primary key default gen_random_uuid(),

  -- 'cuenta_creada' | 'tienda_creada'
  tipo text not null,

  -- Sin foreign key a auth.users a propósito: si se borra la cuenta, el
  -- registro histórico de que existió tiene que sobrevivir.
  user_id uuid,
  comercio_id uuid,

  -- Datos legibles al momento del evento (email, nombre del negocio, slug).
  -- Se guardan copiados y no por join para que el listado siga teniendo
  -- sentido aunque después se renombre o se borre el origen.
  datos jsonb not null default '{}'::jsonb,

  leido_at timestamptz,
  created_at timestamptz not null default now(),

  constraint eventos_admin_tipo_valido
    check (tipo in ('cuenta_creada', 'tienda_creada'))
);

-- El listado siempre pide lo más reciente, y el contador filtra por no leídos.
create index if not exists eventos_admin_recientes_idx
  on public.eventos_admin (created_at desc);

create index if not exists eventos_admin_sin_leer_idx
  on public.eventos_admin (created_at desc)
  where leido_at is null;

comment on table public.eventos_admin is
  'Novedades para el superadmin. Lo escriben triggers, nunca la aplicación.';

-- ---------------------------------------------------------------------------
-- Trigger: cuenta creada
-- ---------------------------------------------------------------------------

create or replace function public.registrar_cuenta_creada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.eventos_admin (tipo, user_id, datos)
  values (
    'cuenta_creada',
    new.id,
    jsonb_build_object(
      'email', new.email,
      'proveedor', coalesce(new.raw_app_meta_data ->> 'provider', 'email')
    )
  );
  return new;
exception when others then
  -- Registrar la novedad nunca puede impedir que alguien cree su cuenta.
  -- Ante cualquier fallo se pierde el aviso, no el alta.
  return new;
end;
$$;

drop trigger if exists eventos_admin_cuenta on auth.users;
create trigger eventos_admin_cuenta
  after insert on auth.users
  for each row execute function public.registrar_cuenta_creada();

-- ---------------------------------------------------------------------------
-- Trigger: tienda creada
-- ---------------------------------------------------------------------------

create or replace function public.registrar_tienda_creada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.eventos_admin (tipo, user_id, comercio_id, datos)
  values (
    'tienda_creada',
    new.user_id,
    new.id,
    jsonb_build_object(
      'nombre', new.nombre,
      'slug', new.slug,
      'plan', new.plan
    )
  );
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists eventos_admin_tienda on public.comercios;
create trigger eventos_admin_tienda
  after insert on public.comercios
  for each row execute function public.registrar_tienda_creada();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.eventos_admin enable row level security;

-- Sólo el superadmin. No hay policy de INSERT: las filas las escriben los
-- triggers, que corren como security definer.
drop policy if exists "eventos_admin: lectura superadmin" on public.eventos_admin;
create policy "eventos_admin: lectura superadmin"
  on public.eventos_admin for select
  to authenticated
  using (is_super_admin());

drop policy if exists "eventos_admin: marcar leido superadmin" on public.eventos_admin;
create policy "eventos_admin: marcar leido superadmin"
  on public.eventos_admin for update
  to authenticated
  using (is_super_admin());

commit;

-- ---------------------------------------------------------------------------
-- Carga inicial opcional — correr aparte
-- ---------------------------------------------------------------------------
--
-- Los triggers sólo registran lo que pase de ahora en adelante. Para ver
-- también lo ya existente, sembrar una vez:
--
--   insert into public.eventos_admin (tipo, user_id, datos, created_at)
--   select 'cuenta_creada', u.id,
--          jsonb_build_object('email', u.email,
--                             'proveedor', coalesce(u.raw_app_meta_data ->> 'provider', 'email')),
--          u.created_at
--     from auth.users u
--    where not exists (select 1 from public.eventos_admin e
--                       where e.tipo = 'cuenta_creada' and e.user_id = u.id);
--
--   insert into public.eventos_admin (tipo, user_id, comercio_id, datos, created_at)
--   select 'tienda_creada', c.user_id, c.id,
--          jsonb_build_object('nombre', c.nombre, 'slug', c.slug, 'plan', c.plan),
--          c.created_at
--     from public.comercios c
--    where not exists (select 1 from public.eventos_admin e
--                       where e.tipo = 'tienda_creada' and e.comercio_id = c.id);
--
-- Después, para no arrancar con todo sin leer:
--   update public.eventos_admin set leido_at = now() where leido_at is null;
--
-- ---------------------------------------------------------------------------
-- Verificación posterior
-- ---------------------------------------------------------------------------
--
-- 1) Los triggers existen:
--
--    select tgname, tgrelid::regclass from pg_trigger
--     where tgname in ('eventos_admin_cuenta', 'eventos_admin_tienda');
--
-- 2) RLS activo y sin policy de INSERT:
--
--    select policyname, cmd from pg_policies
--     where schemaname='public' and tablename='eventos_admin' order by cmd;
--
-- 3) Prueba real: crear una cuenta de prueba desde la aplicación y verificar
--    que aparece la fila. Después borrar la cuenta; el evento debe sobrevivir.
--
--    select tipo, datos, created_at from public.eventos_admin
--     order by created_at desc limit 5;
