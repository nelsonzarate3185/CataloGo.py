-- ============================================================
-- CataloGo — Migración inicial
-- ============================================================

-- Tipos ENUM
create type plan_tipo as enum ('basico', 'pro', 'business');
create type plan_estado as enum ('activo', 'inactivo', 'trial');
create type pedido_estado as enum ('pendiente', 'confirmado', 'entregado', 'cancelado');

-- ============================================================
-- STORES (negocio del comerciante)
-- ============================================================
create table stores (
  id                           uuid primary key default gen_random_uuid(),
  user_id                      uuid not null references auth.users(id) on delete cascade,
  nombre                       text not null,
  slug                         text not null unique,
  descripcion                  text,
  telefono                     text not null,
  logo_url                     text,
  plan                         plan_tipo not null default 'basico',
  plan_estado                  plan_estado not null default 'activo',
  plan_vence_en                timestamptz,
  mercadopago_subscription_id  text,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

-- ============================================================
-- CATÁLOGOS
-- ============================================================
create table catalogos (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  nombre       text not null,
  slug         text not null,
  descripcion  text,
  activo       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(store_id, slug)
);

-- ============================================================
-- CATEGORÍAS
-- ============================================================
create table categorias (
  id           uuid primary key default gen_random_uuid(),
  catalogo_id  uuid not null references catalogos(id) on delete cascade,
  nombre       text not null,
  orden        integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- PRODUCTOS
-- ============================================================
create table productos (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  catalogo_id  uuid not null references catalogos(id) on delete cascade,
  categoria_id uuid references categorias(id) on delete set null,
  nombre       text not null,
  descripcion  text,
  precio       integer not null check (precio >= 0),
  imagen_url   text,
  disponible   boolean not null default true,
  orden        integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- PEDIDOS
-- ============================================================
create table pedidos (
  id               uuid primary key default gen_random_uuid(),
  store_id         uuid not null references stores(id) on delete cascade,
  catalogo_id      uuid not null references catalogos(id) on delete cascade,
  cliente_nombre   text,
  cliente_telefono text,
  items            jsonb not null default '[]',
  total            integer not null check (total >= 0),
  nota             text,
  estado           pedido_estado not null default 'pendiente',
  created_at       timestamptz not null default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
create index idx_stores_user_id        on stores(user_id);
create index idx_catalogos_store_id    on catalogos(store_id);
create index idx_productos_catalogo_id on productos(catalogo_id);
create index idx_productos_store_id    on productos(store_id);
create index idx_pedidos_store_id      on pedidos(store_id);
create index idx_pedidos_created_at    on pedidos(created_at desc);

-- ============================================================
-- FUNCIONES DE ACTUALIZACIÓN automática de updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_stores_updated_at
  before update on stores
  for each row execute function update_updated_at();

create trigger trg_catalogos_updated_at
  before update on catalogos
  for each row execute function update_updated_at();

create trigger trg_productos_updated_at
  before update on productos
  for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table stores     enable row level security;
alter table catalogos  enable row level security;
alter table categorias enable row level security;
alter table productos  enable row level security;
alter table pedidos    enable row level security;

-- Stores: el dueño ve y modifica solo la suya
create policy "stores_owner" on stores
  for all using (auth.uid() = user_id);

-- Catálogos: el dueño gestiona los suyos
create policy "catalogos_owner" on catalogos
  for all using (
    store_id in (select id from stores where user_id = auth.uid())
  );

-- Catálogos públicos activos (lectura sin auth)
create policy "catalogos_public_read" on catalogos
  for select using (activo = true);

-- Categorías: dueño gestiona
create policy "categorias_owner" on categorias
  for all using (
    catalogo_id in (
      select c.id from catalogos c
      join stores s on s.id = c.store_id
      where s.user_id = auth.uid()
    )
  );

-- Categorías: lectura pública
create policy "categorias_public_read" on categorias
  for select using (true);

-- Productos: dueño gestiona
create policy "productos_owner" on productos
  for all using (
    store_id in (select id from stores where user_id = auth.uid())
  );

-- Productos públicos disponibles (lectura sin auth)
create policy "productos_public_read" on productos
  for select using (disponible = true);

-- Pedidos: dueño lee los suyos
create policy "pedidos_owner_read" on pedidos
  for select using (
    store_id in (select id from stores where user_id = auth.uid())
  );

-- Pedidos: cualquiera puede insertar (cuando el cliente pide)
create policy "pedidos_public_insert" on pedidos
  for insert with check (true);
