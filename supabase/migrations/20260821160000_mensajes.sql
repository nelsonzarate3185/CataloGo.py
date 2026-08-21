-- Migración: mensajería entre vendedor y superadmin
--
-- Una conversación por comercio, sin tabla de hilos: el hilo ES el comercio.
-- Un vendedor no tiene motivo para abrir dos conversaciones con soporte, y
-- evitar la tabla intermedia quita una unión en cada consulta.
--
-- Es idempotente: se puede correr más de una vez sin efecto adicional.

begin;

create table if not exists public.mensajes (
  id uuid primary key default gen_random_uuid(),

  comercio_id uuid not null references public.comercios(id) on delete cascade,

  -- Quién escribió. No se guarda el user_id del autor porque del lado del
  -- comercio siempre es su dueño, y del lado de soporte da igual qué persona
  -- del equipo respondió: el vendedor le escribe a CataloGo, no a alguien.
  autor text not null,

  cuerpo text not null,

  -- Momento en que lo leyó el destinatario. NULL = sin leer.
  leido_at timestamptz,

  created_at timestamptz not null default now(),

  constraint mensajes_autor_valido check (autor in ('vendedor', 'admin')),
  constraint mensajes_cuerpo_largo
    check (char_length(trim(cuerpo)) between 1 and 4000)
);

-- El hilo se lee siempre completo y en orden.
create index if not exists mensajes_hilo_idx
  on public.mensajes (comercio_id, created_at);

-- Contadores de sin leer, que son la consulta más frecuente del panel.
create index if not exists mensajes_sin_leer_idx
  on public.mensajes (autor, comercio_id)
  where leido_at is null;

comment on table public.mensajes is
  'Conversación de soporte entre cada comercio y el superadmin. Un hilo por comercio.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.mensajes enable row level security;

-- La comparación va con cast a texto para no depender de si comercios.user_id
-- es uuid o text: en este esquema conviven ambos criterios.
create or replace function public.es_mi_comercio(id_comercio uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.comercios c
     where c.id = id_comercio
       and c.user_id::text = auth_uid()
  );
$$;

-- El dueño ve su propio hilo; el superadmin ve todos.
drop policy if exists "mensajes: lectura" on public.mensajes;
create policy "mensajes: lectura"
  on public.mensajes for select
  to authenticated
  using (is_super_admin() or es_mi_comercio(comercio_id));

-- Cada parte sólo puede escribir con su propia etiqueta de autor: sin esto un
-- vendedor podría insertar un mensaje firmado como 'admin' en su hilo.
drop policy if exists "mensajes: escritura del vendedor" on public.mensajes;
create policy "mensajes: escritura del vendedor"
  on public.mensajes for insert
  to authenticated
  with check (autor = 'vendedor' and es_mi_comercio(comercio_id));

drop policy if exists "mensajes: escritura del admin" on public.mensajes;
create policy "mensajes: escritura del admin"
  on public.mensajes for insert
  to authenticated
  with check (autor = 'admin' and is_super_admin());

-- Marcar como leído. Se permite a ambos lados sobre su propio hilo; qué
-- mensajes marca cada uno lo decide la aplicación.
drop policy if exists "mensajes: marcar leido" on public.mensajes;
create policy "mensajes: marcar leido"
  on public.mensajes for update
  to authenticated
  using (is_super_admin() or es_mi_comercio(comercio_id));

commit;

-- ---------------------------------------------------------------------------
-- Verificación posterior
-- ---------------------------------------------------------------------------
--
-- 1) Policies creadas, con dos de INSERT (una por autor):
--
--    select policyname, cmd, with_check from pg_policies
--     where schemaname='public' and tablename='mensajes' order by cmd, policyname;
--
-- 2) La función de pertenencia responde para un comercio real:
--
--    select public.es_mi_comercio('<un comercio_id>');
--
--    Devuelve false si la sesión del SQL Editor no es el dueño; eso es lo
--    esperado. La prueba real es escribir desde el panel del vendedor.
--
-- 3) Un vendedor no puede firmar como admin. Desde su sesión, un insert con
--    autor='admin' debe ser rechazado por la policy.
