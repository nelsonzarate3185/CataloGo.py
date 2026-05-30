-- CataloGo - Supabase Database Schema
-- Run this in the Supabase SQL Editor to set up your database.
-- Prices are in Paraguayan Guaraníes (PYG) — integers, no decimals.

-- ============================================================
-- TABLES
-- ============================================================

-- Users / Vendor profiles
create table if not exists users (
  uid         text primary key,
  email       text unique not null,
  slug        text unique,
  business_name text,
  role        text not null default 'admin'
                check (role in ('admin', 'buyer', 'super_admin')),
  status      text not null default 'active'
                check (status in ('pending_approval', 'active', 'blocked', 'blocked_unpaid', 'suspended')),
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Product catalog
create table if not exists products (
  id          text primary key,
  owner_id    text not null references users(uid) on delete cascade,
  name        text not null,
  price       bigint not null default 0,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Product categories (per vendor)
create table if not exists categories (
  id          text primary key,
  vendor_id   text not null references users(uid) on delete cascade,
  name        text not null,
  data        jsonb not null default '{}'::jsonb
);

-- Orders
create table if not exists orders (
  id          text primary key,
  vendor_id   text not null references users(uid) on delete cascade,
  status      text not null default 'pending'
                check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  total       bigint not null default 0,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Subscription plans
create table if not exists plans (
  id          text primary key,
  name        text not null,
  price       bigint not null default 0,
  data        jsonb not null default '{}'::jsonb
);

-- Plan upgrade requests from vendors
create table if not exists plan_requests (
  id          text primary key,
  vendor_id   text not null references users(uid) on delete cascade,
  status      text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Activity logs
create table if not exists logs (
  id          text primary key,
  user_id     text not null,
  action      text not null,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists products_owner_id_idx  on products(owner_id);
create index if not exists categories_vendor_id_idx on categories(vendor_id);
create index if not exists orders_vendor_id_idx    on orders(vendor_id);
create index if not exists plan_requests_vendor_id_idx on plan_requests(vendor_id);
create index if not exists users_slug_idx          on users(slug);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table users         enable row level security;
alter table products      enable row level security;
alter table categories    enable row level security;
alter table orders        enable row level security;
alter table plans         enable row level security;
alter table plan_requests enable row level security;
alter table logs          enable row level security;

-- Helper: returns the authenticated user's uid
create or replace function auth_uid() returns text
  language sql stable
  as $$ select auth.uid()::text $$;

-- Helper: returns true if the authenticated user is super_admin
create or replace function is_super_admin() returns boolean
  language sql stable
  as $$
    select exists (
      select 1 from users
      where uid = auth.uid()::text
        and role = 'super_admin'
    )
  $$;

-- ---- users ----
-- Public: anyone can read vendor profiles (needed for marketplace slug lookups)
create policy "users: public read"
  on users for select using (true);

-- Vendors can create their own profile on first login
create policy "users: self insert"
  on users for insert
  with check (uid = auth_uid());

-- Vendors can update their own profile; super_admin can update any
create policy "users: self or admin update"
  on users for update
  using (uid = auth_uid() or is_super_admin());

-- Only super_admin can delete users
create policy "users: admin delete"
  on users for delete using (is_super_admin());

-- ---- products ----
-- Public: anyone can read products (marketplace)
create policy "products: public read"
  on products for select using (true);

-- Vendors can insert their own products
create policy "products: owner insert"
  on products for insert
  with check (owner_id = auth_uid());

-- Vendors can update/delete their own products; super_admin can do anything
create policy "products: owner or admin update"
  on products for update
  using (owner_id = auth_uid() or is_super_admin());

create policy "products: owner or admin delete"
  on products for delete
  using (owner_id = auth_uid() or is_super_admin());

-- ---- categories ----
create policy "categories: public read"
  on categories for select using (true);

create policy "categories: owner insert"
  on categories for insert
  with check (vendor_id = auth_uid());

create policy "categories: owner or admin update"
  on categories for update
  using (vendor_id = auth_uid() or is_super_admin());

create policy "categories: owner or admin delete"
  on categories for delete
  using (vendor_id = auth_uid() or is_super_admin());

-- ---- orders ----
-- Public read so buyers can track their own orders
create policy "orders: public read"
  on orders for select using (true);

-- Anyone (including anonymous buyers) can create an order
create policy "orders: anyone insert"
  on orders for insert with check (true);

-- Only the vendor who owns the order (or super_admin) can update it
create policy "orders: vendor or admin update"
  on orders for update
  using (vendor_id = auth_uid() or is_super_admin());

create policy "orders: admin delete"
  on orders for delete using (is_super_admin());

-- ---- plans ----
-- Public read so all users can see available plans
create policy "plans: public read"
  on plans for select using (true);

-- Only super_admin can manage plans
create policy "plans: admin write"
  on plans for all using (is_super_admin());

-- ---- plan_requests ----
create policy "plan_requests: public read"
  on plan_requests for select using (true);

create policy "plan_requests: vendor insert"
  on plan_requests for insert
  with check (vendor_id = auth_uid());

create policy "plan_requests: admin update"
  on plan_requests for update using (is_super_admin());

create policy "plan_requests: admin delete"
  on plan_requests for delete using (is_super_admin());

-- ---- logs ----
create policy "logs: admin read"
  on logs for select using (is_super_admin());

create policy "logs: authenticated insert"
  on logs for insert
  with check (auth.uid() is not null);

-- ============================================================
-- SEED: Default subscription plans
-- ============================================================

insert into plans (id, name, price, data) values
  ('free',     'Gratis',    0,       '{"productLimit": 5,     "features": ["Hasta 5 productos", "Catálogo digital", "Código QR"], "description": "Ideal para empezar"}'::jsonb),
  ('premium',  'Premium',   120000,  '{"productLimit": 200,   "features": ["Hasta 200 productos", "Imágenes múltiples", "Estadísticas básicas", "Soporte prioritario"], "description": "Para negocios en crecimiento"}'::jsonb),
  ('business', 'Business',  250000,  '{"productLimit": 99999, "features": ["Productos ilimitados", "Panel avanzado", "API access", "Soporte dedicado"], "description": "Para empresas"}'::jsonb)
on conflict (id) do nothing;
