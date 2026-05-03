-- ============================================================
-- CataloGo — Migración 002: schema final
-- Reemplaza la migración 001 (ejecutar en proyecto limpio)
-- ============================================================

-- Limpiar schema anterior si existe
drop table if exists pedidos     cascade;
drop table if exists productos   cascade;
drop table if exists categorias  cascade;
drop table if exists catalogos   cascade;
drop table if exists suscripciones cascade;
drop table if exists stores      cascade;
drop table if exists comercios   cascade;
drop type  if exists plan_tipo   cascade;
drop type  if exists plan_estado cascade;
drop type  if exists pedido_estado cascade;

-- Tipos ENUM
create type plan_tipo    as enum ('basico', 'pro', 'business');
create type plan_estado  as enum ('activo', 'cancelado', 'vencido');
create type pedido_estado as enum ('pendiente', 'confirmado', 'entregado', 'cancelado');

-- ============================================================
-- COMERCIOS
-- ============================================================
create table comercios (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  nombre          text not null,
  slug            text not null unique,
  descripcion     text,
  logo_url        text,
  whatsapp        text not null,              -- número sin 0 ni +595, ej: 981123456
  rubro           text,
  plan            plan_tipo not null default 'basico',
  plan_expira_at  timestamptz,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- CATÁLOGOS
-- ============================================================
create table catalogos (
  id           uuid primary key default gen_random_uuid(),
  comercio_id  uuid not null references comercios(id) on delete cascade,
  nombre       text not null,
  descripcion  text,
  activo       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- CATEGORÍAS
-- ============================================================
create table categorias (
  id           uuid primary key default gen_random_uuid(),
  catalogo_id  uuid not null references catalogos(id) on delete cascade,
  nombre       text not null,
  orden        integer not null default 0,
  activo       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- PRODUCTOS
-- ============================================================
create table productos (
  id           uuid primary key default gen_random_uuid(),
  comercio_id  uuid not null references comercios(id) on delete cascade,
  catalogo_id  uuid not null references catalogos(id) on delete cascade,
  categoria_id uuid references categorias(id) on delete set null,
  nombre       text not null,
  descripcion  text,
  precio       integer not null default 0 check (precio >= 0),
  imagen_url   text,
  disponible   boolean not null default true,
  destacado    boolean not null default false,
  orden        integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- PEDIDOS
-- ============================================================
create table pedidos (
  id               uuid primary key default gen_random_uuid(),
  comercio_id      uuid not null references comercios(id) on delete cascade,
  catalogo_id      uuid not null references catalogos(id) on delete cascade,
  items            jsonb not null default '[]',
  total            integer not null check (total >= 0),
  nombre_cliente   text,
  telefono_cliente text,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- SUSCRIPCIONES
-- ============================================================
create table suscripciones (
  id                  uuid primary key default gen_random_uuid(),
  comercio_id         uuid not null references comercios(id) on delete cascade,
  plan                plan_tipo not null,
  estado              plan_estado not null default 'activo',
  mp_subscription_id  text,
  created_at          timestamptz not null default now(),
  expira_at           timestamptz
);

-- ============================================================
-- ÍNDICES
-- ============================================================
create index idx_comercios_user_id      on comercios(user_id);
create index idx_comercios_slug         on comercios(slug);
create index idx_catalogos_comercio_id  on catalogos(comercio_id);
create index idx_categorias_catalogo_id on categorias(catalogo_id);
create index idx_productos_catalogo_id  on productos(catalogo_id);
create index idx_productos_comercio_id  on productos(comercio_id);
create index idx_pedidos_comercio_id    on pedidos(comercio_id);
create index idx_pedidos_created_at     on pedidos(created_at desc);
create index idx_suscripciones_comercio on suscripciones(comercio_id);

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_comercios_updated_at
  before update on comercios for each row execute function update_updated_at();
create trigger trg_catalogos_updated_at
  before update on catalogos for each row execute function update_updated_at();
create trigger trg_productos_updated_at
  before update on productos for each row execute function update_updated_at();

-- ============================================================
-- STORAGE BUCKETS (ejecutar desde Supabase Dashboard o CLI)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('logos', 'logos', true);
-- insert into storage.buckets (id, name, public) values ('productos', 'productos', true);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table comercios     enable row level security;
alter table catalogos     enable row level security;
alter table categorias    enable row level security;
alter table productos     enable row level security;
alter table pedidos       enable row level security;
alter table suscripciones enable row level security;

-- Helper: devuelve true si el user_id coincide con el dueño del comercio
create or replace function es_dueno_comercio(p_comercio_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from comercios where id = p_comercio_id and user_id = auth.uid()
  );
$$;

-- COMERCIOS
create policy "comercios: dueño ve los suyos" on comercios
  for select using (user_id = auth.uid());
create policy "comercios: dueño edita los suyos" on comercios
  for all using (user_id = auth.uid());

-- CATÁLOGOS — dueño gestiona
create policy "catalogos: dueño gestiona" on catalogos
  for all using (es_dueno_comercio(comercio_id));
-- Lectura pública de catálogos activos
create policy "catalogos: lectura pública activos" on catalogos
  for select using (activo = true);

-- CATEGORÍAS — dueño gestiona
create policy "categorias: dueño gestiona" on categorias
  for all using (
    exists (
      select 1 from catalogos c
      where c.id = catalogo_id and es_dueno_comercio(c.comercio_id)
    )
  );
-- Lectura pública
create policy "categorias: lectura pública" on categorias
  for select using (activo = true);

-- PRODUCTOS — dueño gestiona
create policy "productos: dueño gestiona" on productos
  for all using (es_dueno_comercio(comercio_id));
-- Lectura pública de productos disponibles en catálogos activos
create policy "productos: lectura pública disponibles" on productos
  for select using (
    disponible = true
    and exists (select 1 from catalogos where id = catalogo_id and activo = true)
  );

-- PEDIDOS — solo el dueño ve los suyos
create policy "pedidos: dueño ve los suyos" on pedidos
  for select using (es_dueno_comercio(comercio_id));
-- Cualquiera puede insertar un pedido (cliente sin login)
create policy "pedidos: inserción pública" on pedidos
  for insert with check (
    exists (select 1 from catalogos where id = catalogo_id and activo = true)
  );

-- SUSCRIPCIONES — solo el dueño
create policy "suscripciones: dueño ve las suyas" on suscripciones
  for select using (es_dueno_comercio(comercio_id));
create policy "suscripciones: solo service role inserta" on suscripciones
  for insert with check (false);  -- solo desde webhook con service role
create policy "suscripciones: solo service role actualiza" on suscripciones
  for update using (false);
