-- Migración: reseñas anónimas de productos
-- Sub-proyecto #5 del rediseño Amazon.
-- Ver docs/superpowers/specs/2026-08-20-rediseno-amazon-design.md
--
-- El comprador no tiene cuenta, así que la reseña es anónima con firma
-- obligatoria. La verificación real es imposible sin login; lo que se hace es
-- encarecer el abuso (rate limit por IP, moderación opcional del comercio).
--
-- Es idempotente: se puede correr más de una vez sin efecto adicional.

begin;

-- ---------------------------------------------------------------------------
-- Preferencia de moderación por comercio
-- ---------------------------------------------------------------------------

-- false = las reseñas se publican al instante (default: menor fricción).
-- true  = quedan pendientes hasta que el dueño las apruebe. Es el interruptor
--         que el comercio activa si lo empiezan a sabotear.
alter table public.comercios
  add column if not exists resenas_moderadas boolean not null default false;

comment on column public.comercios.resenas_moderadas is
  'Si es true, las reseñas nuevas quedan pendientes de aprobación del dueño.';

-- ---------------------------------------------------------------------------
-- Agregados desnormalizados en productos
-- ---------------------------------------------------------------------------

-- Se desnormaliza a propósito: el catálogo público trae todos los productos en
-- una sola consulta y la grilla necesita mostrar estrellas. Calcularlo con un
-- join agregado obligaría a cambiar esa consulta y a paginar antes de tiempo.
alter table public.productos
  add column if not exists calificacion_promedio numeric(2,1);
alter table public.productos
  add column if not exists resenas_count integer not null default 0;

comment on column public.productos.calificacion_promedio is
  'Promedio de reseñas aprobadas, 1.0 a 5.0. NULL si no tiene ninguna. Lo mantiene un trigger.';
comment on column public.productos.resenas_count is
  'Cantidad de reseñas aprobadas. Lo mantiene un trigger.';

-- ---------------------------------------------------------------------------
-- Tabla de reseñas
-- ---------------------------------------------------------------------------

create table if not exists public.resenas (
  id uuid primary key default gen_random_uuid(),

  -- comercio_id se guarda además de producto_id para poder filtrar por tenant
  -- sin join. Es la regla de aislamiento del proyecto.
  comercio_id uuid not null references public.comercios(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,

  -- La firma. No verifica nada, pero obliga a asumir un nombre.
  nombre text not null,
  calificacion integer not null,
  comentario text,

  aprobada boolean not null default true,

  -- sha256(ip + sal). Nunca se guarda la IP en crudo: sirve sólo para limitar
  -- la frecuencia, no para identificar a nadie.
  ip_hash text,

  created_at timestamptz not null default now(),

  constraint resenas_calificacion_rango check (calificacion between 1 and 5),
  constraint resenas_nombre_largo check (char_length(trim(nombre)) between 2 and 60),
  constraint resenas_comentario_largo check (comentario is null or char_length(comentario) <= 1000)
);

-- Una reseña por IP y por producto. Es el freno principal contra el review
-- bombing sobre un producto puntual.
create unique index if not exists resenas_ip_producto_idx
  on public.resenas (producto_id, ip_hash)
  where ip_hash is not null;

create index if not exists resenas_producto_idx
  on public.resenas (producto_id, aprobada, created_at desc);

create index if not exists resenas_comercio_idx
  on public.resenas (comercio_id, aprobada, created_at desc);

-- ---------------------------------------------------------------------------
-- Trigger de agregados
-- ---------------------------------------------------------------------------

create or replace function public.recalcular_resenas_producto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  objetivo uuid;
begin
  objetivo := coalesce(new.producto_id, old.producto_id);

  update public.productos p
     set resenas_count = sub.cantidad,
         calificacion_promedio = sub.promedio
    from (
      select count(*)::integer as cantidad,
             round(avg(calificacion)::numeric, 1) as promedio
        from public.resenas
       where producto_id = objetivo
         and aprobada = true
    ) sub
   where p.id = objetivo;

  return null;
end;
$$;

drop trigger if exists resenas_agregados on public.resenas;
create trigger resenas_agregados
  after insert or update or delete on public.resenas
  for each row execute function public.recalcular_resenas_producto();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.resenas enable row level security;

-- Lectura pública: sólo reseñas aprobadas. El comprador no tiene sesión.
drop policy if exists "resenas lectura publica" on public.resenas;
create policy "resenas lectura publica"
  on public.resenas for select
  using (aprobada = true);

-- El dueño ve todas las suyas, incluidas las pendientes.
drop policy if exists "resenas lectura del dueno" on public.resenas;
create policy "resenas lectura del dueno"
  on public.resenas for select
  to authenticated
  using (
    exists (
      select 1 from public.comercios c
       where c.id = resenas.comercio_id
         and c.user_id = auth.uid()
    )
  );

-- El dueño modera y elimina las suyas.
drop policy if exists "resenas moderacion del dueno" on public.resenas;
create policy "resenas moderacion del dueno"
  on public.resenas for update
  to authenticated
  using (
    exists (
      select 1 from public.comercios c
       where c.id = resenas.comercio_id
         and c.user_id = auth.uid()
    )
  );

drop policy if exists "resenas borrado del dueno" on public.resenas;
create policy "resenas borrado del dueno"
  on public.resenas for delete
  to authenticated
  using (
    exists (
      select 1 from public.comercios c
       where c.id = resenas.comercio_id
         and c.user_id = auth.uid()
    )
  );

-- No hay policy de INSERT a propósito. Las altas pasan por /api/resenas con la
-- service role key, que es donde viven la validación y el rate limit. Una
-- policy de insert pública sería una puerta abierta a la inundación.

commit;

-- ---------------------------------------------------------------------------
-- Verificación posterior — correr aparte y revisar la salida
-- ---------------------------------------------------------------------------
--
-- 1) Columnas y tabla:
--
--    select column_name, data_type from information_schema.columns
--     where table_schema='public' and table_name='resenas' order by ordinal_position;
--
--    select column_name from information_schema.columns
--     where table_schema='public' and table_name='productos'
--       and column_name in ('calificacion_promedio','resenas_count');
--
-- 2) RLS activo y sin policy de insert:
--
--    select relname, relrowsecurity from pg_class where relname='resenas';
--    select policyname, cmd from pg_policies
--     where schemaname='public' and tablename='resenas' order by cmd;
--
--    Se espera: relrowsecurity = true, y ninguna fila con cmd = 'INSERT'.
--
-- 3) El trigger recalcula. Insertar una reseña de prueba con la service role
--    key y verificar que productos.resenas_count pasó a 1, después borrarla y
--    verificar que volvió a 0 y calificacion_promedio a NULL.
