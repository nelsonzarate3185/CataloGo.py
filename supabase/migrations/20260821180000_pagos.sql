-- Migración: registro de pagos de suscripción
--
-- Los cobros son manuales (transferencia, efectivo), así que esta tabla es un
-- libro de pagos recibidos, no una integración con pasarela.
--
-- No reutiliza `suscripciones`: sus campos describen el modelo de MercadoPago
-- (mp_subscription_id, estado de pasarela) que dejó de usarse. Aquella queda
-- intacta por si conserva datos históricos.
--
-- Es idempotente: se puede correr más de una vez sin efecto adicional.

begin;

create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),

  comercio_id uuid not null references public.comercios(id) on delete cascade,

  -- Monto en guaraníes, sin decimales, igual que el resto del sistema.
  monto integer not null,

  -- Plan que cubre el pago. Se copia y no se lee de comercios porque el plan
  -- puede cambiar después: el registro tiene que decir qué se cobró entonces.
  plan text not null,

  -- Período cubierto. `hasta` es la fecha de vencimiento.
  periodo_desde date not null,
  periodo_hasta date not null,

  metodo text,
  nota text,

  -- Email de quien lo registró, copiado al momento.
  registrado_por text,

  created_at timestamptz not null default now(),

  constraint pagos_monto_no_negativo check (monto >= 0),
  constraint pagos_periodo_coherente check (periodo_hasta > periodo_desde)
);

create index if not exists pagos_comercio_idx
  on public.pagos (comercio_id, periodo_hasta desc);

comment on table public.pagos is
  'Pagos de suscripción recibidos. Cobro manual: lo registra el superadmin.';

-- ---------------------------------------------------------------------------
-- Vencimiento en comercios
-- ---------------------------------------------------------------------------

-- `plan_expira_at` ya existía. Se mantiene sincronizado con el último período
-- pagado mediante trigger, en vez de recalcularlo en cada consulta: el panel
-- necesita ordenar y filtrar por vencimiento sobre todos los comercios.
create or replace function public.actualizar_vencimiento_comercio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  objetivo uuid;
begin
  objetivo := coalesce(new.comercio_id, old.comercio_id);

  update public.comercios c
     set plan_expira_at = (
       select max(p.periodo_hasta)::timestamptz
         from public.pagos p
        where p.comercio_id = objetivo
     )
   where c.id = objetivo;

  return null;
end;
$$;

drop trigger if exists pagos_vencimiento on public.pagos;
create trigger pagos_vencimiento
  after insert or update or delete on public.pagos
  for each row execute function public.actualizar_vencimiento_comercio();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.pagos enable row level security;

-- El superadmin gestiona todo.
drop policy if exists "pagos: superadmin gestiona" on public.pagos;
create policy "pagos: superadmin gestiona"
  on public.pagos for all
  to authenticated
  using (is_super_admin())
  with check (is_super_admin());

-- El dueño ve sus propios pagos, sin poder crearlos ni modificarlos: quien
-- cobra es CataloGo.
drop policy if exists "pagos: lectura del dueno" on public.pagos;
create policy "pagos: lectura del dueno"
  on public.pagos for select
  to authenticated
  using (es_mi_comercio(comercio_id));

commit;

-- ---------------------------------------------------------------------------
-- Carga inicial opcional — correr aparte
-- ---------------------------------------------------------------------------
--
-- Si algunos comercios ya tienen plan_expira_at cargado de antes, el trigger
-- lo va a sobrescribir en cuanto se registre su primer pago. Para conservar esa
-- fecha, registrar un pago histórico por cada uno antes de empezar:
--
--   insert into public.pagos (comercio_id, monto, plan, periodo_desde, periodo_hasta, nota)
--   select c.id, 0, c.plan, (c.plan_expira_at - interval '1 month')::date,
--          c.plan_expira_at::date, 'Carga inicial: vencimiento previo al registro de pagos'
--     from public.comercios c
--    where c.plan_expira_at is not null
--      and not exists (select 1 from public.pagos p where p.comercio_id = c.id);
--
-- ---------------------------------------------------------------------------
-- Verificación posterior
-- ---------------------------------------------------------------------------
--
-- 1) Tabla, trigger y policies:
--
--    select tgname from pg_trigger where tgname = 'pagos_vencimiento';
--    select policyname, cmd from pg_policies
--     where schemaname='public' and tablename='pagos' order by cmd;
--
-- 2) El trigger sincroniza. Registrar un pago de prueba y verificar que
--    comercios.plan_expira_at pasó a la fecha de periodo_hasta; después
--    borrarlo y verificar que volvió a NULL o al pago anterior.
--
--    select c.nombre, c.plan_expira_at from public.comercios c
--     where c.id = '<comercio_id>';
