-- Migración: borrar las imágenes cuando se borra su dueño
--
-- Hasta ahora nada eliminaba jamás un objeto del Storage. Borrar un producto
-- sólo quitaba su fila: sus imágenes quedaban para siempre en
-- `productos/{comercio_id}/{producto_id}.ext`.
--
-- Con rotación de catálogo eso significa que el Storage sólo crece y nunca se
-- libera. En una proyección de 100 comercios con 30% de rotación mensual, a los
-- seis meses cerca de dos tercios del almacenamiento serían imágenes de
-- productos que ya no existen.
--
-- Va en trigger y no en la aplicación porque hay caminos que no pasan por
-- código nuestro: `comercios` tiene `on delete cascade` sobre `productos`, así
-- que borrar un comercio borra sus productos sin que la app se entere.
--
-- Es idempotente: se puede correr más de una vez sin efecto adicional.

begin;

-- ---------------------------------------------------------------------------
-- Cómo se identifica el dueño de un objeto
-- ---------------------------------------------------------------------------

-- Las rutas son `{comercio_id}/{producto_id}.ext` y
-- `{comercio_id}/{producto_id}-adicional-N.ext` en el bucket `productos`, y
-- `{comercio_id}/logo.ext` en `logos`.
--
-- Devuelve NULL si el nombre no sigue la convención. Ese NULL es deliberado:
-- todo lo que sigue exige que la extracción haya funcionado antes de borrar
-- nada, para que un archivo con formato inesperado nunca se elimine por no
-- poder asociarlo a un producto.
create or replace function public.id_producto_de_ruta(ruta text)
returns uuid
language sql
immutable
as $$
  select nullif(substring(ruta from '^[^/]+/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})'), '')::uuid;
$$;

create or replace function public.id_comercio_de_ruta(ruta text)
returns uuid
language sql
immutable
as $$
  select nullif(substring(ruta from '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/'), '')::uuid;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: al borrar un producto, se van sus imágenes
-- ---------------------------------------------------------------------------

create or replace function public.borrar_imagenes_producto()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  delete from storage.objects o
   where o.bucket_id = 'productos'
     and public.id_producto_de_ruta(o.name) = old.id;

  return old;
exception when others then
  -- Limpiar el Storage nunca puede impedir que el comerciante borre su
  -- producto. Si falla, queda una imagen huérfana que la limpieza periódica
  -- recoge después; bloquear el borrado sería mucho peor.
  return old;
end;
$$;

drop trigger if exists productos_borrar_imagenes on public.productos;
create trigger productos_borrar_imagenes
  after delete on public.productos
  for each row execute function public.borrar_imagenes_producto();

-- ---------------------------------------------------------------------------
-- Trigger: al borrar un comercio, se va todo lo suyo
-- ---------------------------------------------------------------------------

-- El cascade sobre productos dispara el trigger de arriba fila por fila, pero
-- el logo cuelga del comercio y no de ningún producto. Se borra la carpeta
-- entera de los dos buckets para no dejar nada colgado.
create or replace function public.borrar_archivos_comercio()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  delete from storage.objects o
   where o.bucket_id in ('productos', 'logos')
     and public.id_comercio_de_ruta(o.name) = old.id;

  return old;
exception when others then
  return old;
end;
$$;

drop trigger if exists comercios_borrar_archivos on public.comercios;
create trigger comercios_borrar_archivos
  after delete on public.comercios
  for each row execute function public.borrar_archivos_comercio();

commit;

-- ---------------------------------------------------------------------------
-- DIAGNÓSTICO — correr ANTES de la limpieza
-- ---------------------------------------------------------------------------
--
-- Cuánto hay acumulado y qué se liberaría. Mirar esto primero: la limpieza
-- borra archivos y no tiene vuelta atrás.
--
--   select o.bucket_id,
--          count(*) as objetos,
--          pg_size_pretty(sum((o.metadata ->> 'size')::bigint)) as peso
--     from storage.objects o
--    where o.bucket_id in ('productos', 'logos')
--    group by o.bucket_id;
--
--   -- Huérfanas del bucket productos
--   select count(*) as huerfanas,
--          pg_size_pretty(coalesce(sum((o.metadata ->> 'size')::bigint), 0)) as peso
--     from storage.objects o
--    where o.bucket_id = 'productos'
--      and public.id_producto_de_ruta(o.name) is not null
--      and not exists (
--        select 1 from public.productos p
--         where p.id = public.id_producto_de_ruta(o.name)
--      );
--
--   -- Archivos cuyo nombre NO sigue la convención. La limpieza no los toca;
--   -- si aparecen muchos, revisar antes de seguir.
--   select o.bucket_id, o.name
--     from storage.objects o
--    where o.bucket_id in ('productos', 'logos')
--      and public.id_comercio_de_ruta(o.name) is null
--    limit 50;
--
-- ---------------------------------------------------------------------------
-- LIMPIEZA DE LO ACUMULADO — correr una vez, después del diagnóstico
-- ---------------------------------------------------------------------------
--
--   -- 1. Imágenes de productos que ya no existen
--   delete from storage.objects o
--    where o.bucket_id = 'productos'
--      and public.id_producto_de_ruta(o.name) is not null
--      and not exists (
--        select 1 from public.productos p
--         where p.id = public.id_producto_de_ruta(o.name)
--      );
--
--   -- 2. Logos de comercios que ya no existen
--   delete from storage.objects o
--    where o.bucket_id = 'logos'
--      and public.id_comercio_de_ruta(o.name) is not null
--      and not exists (
--        select 1 from public.comercios c
--         where c.id = public.id_comercio_de_ruta(o.name)
--      );
--
--   -- 3. Imágenes de productos que existen pero ya no las referencian.
--   --    Pasa cuando se reemplaza una foto por otra de distinta extensión:
--   --    el upsert escribe un objeto nuevo y el anterior queda colgado.
--   delete from storage.objects o
--    where o.bucket_id = 'productos'
--      and public.id_producto_de_ruta(o.name) is not null
--      and exists (select 1 from public.productos p where p.id = public.id_producto_de_ruta(o.name))
--      and not exists (
--        select 1 from public.productos p
--         where p.id = public.id_producto_de_ruta(o.name)
--           and (
--             p.imagen_url like '%' || o.name
--             or exists (
--               select 1 from jsonb_array_elements_text(coalesce(p.imagenes_adicionales, '[]'::jsonb)) u(url)
--                where u.url like '%' || o.name
--             )
--           )
--      );
--
-- ---------------------------------------------------------------------------
-- Verificación posterior
-- ---------------------------------------------------------------------------
--
-- 1) Ya no quedan huérfanas: repetir la consulta de diagnóstico, debe dar 0.
--
-- 2) El trigger funciona: borrar un producto de prueba desde el panel y
--    verificar que sus objetos desaparecieron.
--
--      select count(*) from storage.objects
--       where bucket_id = 'productos'
--         and public.id_producto_de_ruta(name) = '<producto_id>';   -- 0
--
-- 3) El catálogo público sigue mostrando las fotos de los productos vivos.
--    Si alguna se rompió, la limpieza borró de más: restaurar desde el
--    respaldo del proyecto en Supabase antes de seguir.
