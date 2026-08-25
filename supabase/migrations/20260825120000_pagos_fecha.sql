-- Migración: fecha real del pago
--
-- `created_at` es cuándo se cargó el pago en el sistema, no cuándo entró el
-- dinero. Un pago recibido el 30 de agosto y registrado el 2 de septiembre
-- caería en el mes equivocado, y un reporte de ingresos mensuales que se
-- equivoca de mes no sirve para nada.
--
-- Es idempotente: se puede correr más de una vez sin efecto adicional.

begin;

alter table public.pagos
  add column if not exists fecha_pago date;

-- Los pagos ya cargados se rellenan con su fecha de registro, que es la mejor
-- aproximación disponible. Sólo después se hace obligatoria la columna, para
-- que el ALTER no falle sobre filas existentes.
update public.pagos
   set fecha_pago = created_at::date
 where fecha_pago is null;

alter table public.pagos
  alter column fecha_pago set default current_date;

alter table public.pagos
  alter column fecha_pago set not null;

comment on column public.pagos.fecha_pago is
  'Fecha en que entró el dinero. Distinta de created_at, que es cuándo se registró.';

-- El histórico se filtra y agrupa por esta fecha.
create index if not exists pagos_fecha_idx
  on public.pagos (fecha_pago desc);

commit;

-- ---------------------------------------------------------------------------
-- Verificación posterior
-- ---------------------------------------------------------------------------
--
-- 1) La columna existe, es obligatoria y ninguna fila quedó vacía:
--
--    select column_name, is_nullable, column_default
--      from information_schema.columns
--     where table_schema='public' and table_name='pagos' and column_name='fecha_pago';
--
--    select count(*) from public.pagos where fecha_pago is null;   -- 0
--
-- 2) Ingresos por mes, que es lo que el panel va a mostrar:
--
--    select to_char(fecha_pago, 'YYYY-MM') as mes,
--           count(*) as pagos,
--           sum(monto) as total
--      from public.pagos
--     group by 1 order by 1 desc;
