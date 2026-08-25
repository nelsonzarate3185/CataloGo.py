-- Migración: soporte de filtrado y paginación en la base
--
-- El catálogo traía todos los productos del comercio en una consulta y
-- filtraba en memoria. Con planes ilimitados eso significa mandar el catálogo
-- entero a un teléfono en 4G para mostrar veinticuatro productos.
--
-- Para filtrar y ordenar en la base hacen falta dos valores derivados que
-- PostgREST no puede calcular: comparar dos columnas entre sí (precio_anterior
-- contra precio) no se expresa en su sintaxis de filtros.
--
-- Es idempotente: se puede correr más de una vez sin efecto adicional.

begin;

-- ---------------------------------------------------------------------------
-- Descuento como columna calculada
-- ---------------------------------------------------------------------------

-- Columna generada y no un trigger: Postgres la mantiene siempre coherente con
-- precio y precio_anterior, sin posibilidad de que quede desincronizada.
alter table public.productos
  add column if not exists descuento_pct integer
  generated always as (
    case
      when precio_anterior is not null
       and precio_anterior > precio
       and precio_anterior > 0
      then ((precio_anterior - precio) * 100 / precio_anterior)
      else 0
    end
  ) stored;

comment on column public.productos.descuento_pct is
  'Porcentaje de descuento, calculado. Permite filtrar ofertas y ordenar por descuento sin traer todo el catálogo.';

-- ---------------------------------------------------------------------------
-- Índices para los filtros y órdenes del catálogo
-- ---------------------------------------------------------------------------

-- Todo listado parte de un catálogo y sólo muestra lo disponible.
create index if not exists productos_catalogo_disponible_idx
  on public.productos (catalogo_id, disponible);

create index if not exists productos_catalogo_precio_idx
  on public.productos (catalogo_id, precio)
  where disponible = true;

create index if not exists productos_catalogo_ofertas_idx
  on public.productos (catalogo_id, descuento_pct desc)
  where disponible = true and descuento_pct > 0;

-- ---------------------------------------------------------------------------
-- Facetas del catálogo
-- ---------------------------------------------------------------------------

-- Marcas y rango de precios se calculaban recorriendo todos los productos en
-- memoria. Con paginación esa información ya no está del lado del servidor de
-- aplicación, así que la resuelve la base de una sola pasada.
--
-- security definer por la misma razón que comercio_publico: el catálogo lo abre
-- cualquiera, y esto devuelve sólo datos agregados y públicos.
create or replace function public.catalogo_facetas(p_catalogo_id uuid)
returns table (
  marcas text[],
  precio_min integer,
  precio_max integer,
  hay_ofertas boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(
      array_agg(distinct p.marca order by p.marca)
        filter (where p.marca is not null and btrim(p.marca) <> ''),
      '{}'::text[]
    ),
    coalesce(min(p.precio), 0),
    coalesce(max(p.precio), 0),
    coalesce(bool_or(p.descuento_pct > 0), false)
    from public.productos p
   where p.catalogo_id = p_catalogo_id
     and p.disponible = true;
$$;

grant execute on function public.catalogo_facetas(uuid) to anon, authenticated;

commit;

-- ---------------------------------------------------------------------------
-- Verificación posterior
-- ---------------------------------------------------------------------------
--
-- 1) El descuento se calcula solo. Sobre un producto con oferta:
--
--    select nombre, precio, precio_anterior, descuento_pct
--      from public.productos where precio_anterior is not null limit 5;
--
--    Cambiar el precio y verificar que descuento_pct se actualiza sin tocarlo.
--
-- 2) Las facetas responden:
--
--    select * from public.catalogo_facetas('<catalogo_id>');
--
-- 3) Los índices se usan. Sobre un catálogo con varios productos:
--
--    explain analyze
--    select * from public.productos
--     where catalogo_id = '<catalogo_id>' and disponible = true
--     order by precio limit 24;
--
--    Debe aparecer un Index Scan, no un Seq Scan sobre toda la tabla.
