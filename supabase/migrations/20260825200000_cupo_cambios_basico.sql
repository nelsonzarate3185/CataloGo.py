-- Migración: cupo de cambios del plan básico
--
-- El plan básico permite 5 productos publicados y 3 cambios por trimestre. El
-- contador se reinicia solo a los 3 meses del primer cambio del período.
--
-- Un "cambio" es **publicar un producto**, no crearlo: cuenta tanto un alta
-- visible como reactivar uno que estaba oculto. Medir sólo las altas dejaba un
-- agujero, porque crear productos ocultos nunca estuvo limitado: un comercio
-- podía cargar cien inactivos y rotar cuáles cinco se ven, gratis y sin tope.
--
-- Los primeros 5 no consumen cupo: son la carga inicial. Sin esa excepción un
-- comerciante nuevo agota su cupo el primer día armando su tienda.
--
-- Es idempotente: se puede correr más de una vez sin efecto adicional.

begin;

-- ---------------------------------------------------------------------------
-- Estado del cupo, en el comercio
-- ---------------------------------------------------------------------------

alter table public.comercios
  add column if not exists cambios_usados integer not null default 0;

-- Inicio del período vigente. NULL = todavía no gastó ningún cambio.
alter table public.comercios
  add column if not exists cambios_periodo_inicio date;

-- Veces que un producto de este comercio pasó a estar publicado. Se persiste
-- porque no se puede deducir del estado actual: al borrar un producto
-- desaparece su rastro, y hace falta saber si ya se usó la carga inicial.
alter table public.comercios
  add column if not exists publicaciones_totales integer not null default 0;

comment on column public.comercios.cambios_usados is
  'Cambios consumidos en el período vigente. Sólo aplica al plan básico.';
comment on column public.comercios.cambios_periodo_inicio is
  'Inicio del período de 3 meses. NULL si todavía no gastó ningún cambio.';
comment on column public.comercios.publicaciones_totales is
  'Veces que un producto de este comercio pasó a publicado. Las primeras 5 son carga inicial y no consumen cupo.';

-- Los comercios que ya tienen productos publicados no deben empezar con la
-- carga inicial disponible de nuevo.
update public.comercios c
   set publicaciones_totales = sub.publicados
  from (
    select comercio_id, count(*)::integer as publicados
      from public.productos
     where disponible = true
     group by comercio_id
  ) sub
 where c.id = sub.comercio_id
   and c.publicaciones_totales = 0;

-- ---------------------------------------------------------------------------
-- Consumo del cupo
-- ---------------------------------------------------------------------------

create or replace function public.limite_cambios_plan(p_plan text)
returns integer
language sql
immutable
as $$
  -- Sólo el plan gratuito tiene cupo de cambios; los pagos no se limitan.
  select case p_plan when 'basico' then 3 else null end;
$$;

create or replace function public.consumir_cambio_publicacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  com record;
  cupo integer;
  carga_inicial constant integer := 5;
  meses constant integer := 3;
  vence date;
begin
  -- Sólo interesa cuando un producto pasa a estar publicado.
  if tg_op = 'INSERT' and new.disponible is not true then
    return new;
  end if;
  if tg_op = 'UPDATE' and not (old.disponible is not true and new.disponible is true) then
    return new;
  end if;

  -- `for update` hace atómico el consumo: sin el bloqueo, dos publicaciones
  -- simultáneas leerían el mismo contador y ambas pasarían.
  select id, plan, cambios_usados, cambios_periodo_inicio, publicaciones_totales
    into com
    from public.comercios
   where id = new.comercio_id
     for update;

  if not found then
    return new;
  end if;

  cupo := public.limite_cambios_plan(com.plan::text);

  -- Plan sin cupo: sólo se lleva la cuenta, por si más adelante baja a básico.
  if cupo is null then
    update public.comercios
       set publicaciones_totales = publicaciones_totales + 1
     where id = com.id;
    return new;
  end if;

  -- Reinicio automático del período.
  if com.cambios_periodo_inicio is null
     or com.cambios_periodo_inicio + make_interval(months => meses) <= current_date then
    com.cambios_usados := 0;
    com.cambios_periodo_inicio := current_date;
  end if;

  if com.publicaciones_totales >= carga_inicial then
    if com.cambios_usados >= cupo then
      vence := (com.cambios_periodo_inicio + make_interval(months => meses))::date;
      raise exception
        'Usaste los % cambios de tu plan del período. Vas a poder publicar productos nuevos desde el %, o podés pasar a un plan superior.',
        cupo, to_char(vence, 'DD/MM/YYYY')
        using errcode = 'check_violation';
    end if;
    com.cambios_usados := com.cambios_usados + 1;
  end if;

  update public.comercios
     set cambios_usados = com.cambios_usados,
         cambios_periodo_inicio = com.cambios_periodo_inicio,
         publicaciones_totales = publicaciones_totales + 1
   where id = com.id;

  return new;
end;
$$;

-- Nombre con prefijo 'z' para que corra después de productos_limite_plan:
-- Postgres dispara los triggers por orden alfabético, y no tiene sentido
-- gastar un cambio en una publicación que el tope de 5 va a rechazar igual.
drop trigger if exists z_productos_cupo_cambios on public.productos;
create trigger z_productos_cupo_cambios
  before insert or update on public.productos
  for each row execute function public.consumir_cambio_publicacion();

commit;

-- ---------------------------------------------------------------------------
-- Verificación posterior
-- ---------------------------------------------------------------------------
--
-- 1) Estado del cupo de un comercio básico:
--
--    select nombre, plan, publicaciones_totales, cambios_usados,
--           cambios_periodo_inicio,
--           (cambios_periodo_inicio + make_interval(months => 3))::date as se_reinicia
--      from public.comercios where plan = 'basico';
--
-- 2) La carga inicial no consume. Sobre un comercio básico nuevo, publicar 5
--    productos y verificar que cambios_usados sigue en 0 y
--    publicaciones_totales llegó a 5.
--
-- 3) El sexto sí consume. Desactivar uno y publicar otro: cambios_usados pasa
--    a 1. Repetir hasta 3 y verificar que el cuarto falla con el mensaje que
--    incluye la fecha de reinicio.
--
-- 4) Reactivar también consume, que es lo que cierra el agujero de rotar
--    productos ocultos:
--
--    update public.productos set disponible = false where id = '<p>';
--    update public.productos set disponible = true  where id = '<p>';
--    -- cambios_usados sube en 1
--
-- 5) Borrar y desactivar NO consumen. Sólo se paga al publicar.
--
-- 6) Para regalarle el período a un comercio puntual:
--
--    update public.comercios
--       set cambios_usados = 0, cambios_periodo_inicio = current_date
--     where id = '<comercio>';
