-- Migración: campos de comercio en productos
-- Sub-proyecto #2 del rediseño Amazon.
-- Ver docs/superpowers/specs/2026-08-20-rediseno-amazon-design.md
--
-- Agrega precio_anterior (descuentos), stock (control opcional) y marca.
-- Es idempotente: se puede correr más de una vez sin efecto adicional.

begin;

-- ---------------------------------------------------------------------------
-- Columnas nuevas
-- ---------------------------------------------------------------------------

-- Precio de lista anterior, para mostrar el descuento tachado.
-- Sin CHECK contra precio a propósito: si queda menor o igual, la UI
-- simplemente no muestra el descuento. Un CHECK bloquearía al dueño mientras
-- edita el producto, que es peor experiencia que un descuento no mostrado.
alter table public.productos
  add column if not exists precio_anterior integer;

-- Control de stock opcional.
-- NULL significa "este comercio no lleva control de stock", que es el
-- comportamiento actual y el default para todos los productos existentes.
-- Un número muestra la cantidad restante en el catálogo.
-- `disponible` sigue siendo el interruptor maestro de compra.
alter table public.productos
  add column if not exists stock integer;

-- Marca del producto. Texto libre en vez de tabla propia: los planes van de 5 a
-- 90 productos, una tabla de marcas sería desproporcionada. El dashboard ofrece
-- autocompletado a partir de los valores ya cargados.
alter table public.productos
  add column if not exists marca text;

-- ---------------------------------------------------------------------------
-- Restricciones
-- ---------------------------------------------------------------------------

-- Stock negativo no significa nada y no es un estado intermedio de edición.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'productos_stock_no_negativo'
  ) then
    alter table public.productos
      add constraint productos_stock_no_negativo
      check (stock is null or stock >= 0);
  end if;
end $$;

-- Mismo criterio para el precio anterior: no puede ser negativo.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'productos_precio_anterior_no_negativo'
  ) then
    alter table public.productos
      add constraint productos_precio_anterior_no_negativo
      check (precio_anterior is null or precio_anterior >= 0);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Índice para el filtro por marca del catálogo público
-- ---------------------------------------------------------------------------

-- Parcial: sólo indexa filas con marca cargada, que serán minoría al principio.
create index if not exists productos_comercio_marca_idx
  on public.productos (comercio_id, marca)
  where marca is not null;

-- ---------------------------------------------------------------------------
-- Documentación de columnas
-- ---------------------------------------------------------------------------

comment on column public.productos.precio_anterior is
  'Precio de lista anterior en guaraníes. Si es mayor que precio, la UI muestra el descuento.';
comment on column public.productos.stock is
  'Unidades restantes. NULL = el comercio no lleva control de stock. No bloquea la compra: eso lo decide disponible.';
comment on column public.productos.marca is
  'Marca del producto, texto libre. Alimenta el filtro por marca del catálogo público.';

commit;

-- ---------------------------------------------------------------------------
-- Verificación posterior — correr aparte y revisar la salida
-- ---------------------------------------------------------------------------
--
-- 1) Confirmar que las columnas existen:
--
--    select column_name, data_type, is_nullable
--      from information_schema.columns
--     where table_schema = 'public' and table_name = 'productos'
--       and column_name in ('precio_anterior', 'stock', 'marca');
--
-- 2) Confirmar que RLS sigue activo y ver qué políticas cubren la tabla.
--    Agregar columnas hereda las políticas existentes: no hacen falta
--    políticas nuevas, pero conviene verificar que las que hay siguen ahí.
--
--    select relname, relrowsecurity
--      from pg_class where relname = 'productos';
--
--    select policyname, cmd, roles, qual
--      from pg_policies
--     where schemaname = 'public' and tablename = 'productos';
--
-- 3) Confirmar que ningún producto existente cambió de estado:
--
--    select count(*) as total,
--           count(precio_anterior) as con_precio_anterior,
--           count(stock) as con_stock,
--           count(marca) as con_marca
--      from public.productos;
--
--    Se espera: total = N, y las otras tres en 0.
