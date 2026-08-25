export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import HistoricoPagosClient, {
  type PagoHistorico,
} from "@/components/admin/HistoricoPagosClient";

export default async function HistoricoPagosPage() {
  const admin = createAdminClient();

  const [{ data: pagos, error }, { data: comercios }] = await Promise.all([
    admin.from("pagos").select("*").order("fecha_pago", { ascending: false }).limit(2000),
    admin.from("comercios").select("id, nombre").order("nombre"),
  ]);

  if (error) throw new Error(`Error cargando los pagos: ${error.message}`);

  const nombres = new Map((comercios ?? []).map((c) => [c.id, c.nombre]));

  const filas: PagoHistorico[] = (pagos ?? []).map((p) => ({
    id: p.id,
    comercio_id: p.comercio_id,
    comercio_nombre: nombres.get(p.comercio_id) ?? "Comercio eliminado",
    monto: p.monto,
    plan: p.plan,
    fecha_pago: p.fecha_pago,
    periodo_desde: p.periodo_desde,
    periodo_hasta: p.periodo_hasta,
    metodo: p.metodo,
    nota: p.nota,
    registrado_por: p.registrado_por,
  }));

  // El rango arranca en el mes en curso, que es la vista más frecuente. La
  // fecha sale del servidor para no depender del reloj del navegador.
  const hoy = new Date();
  const primerDiaDelMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Histórico de pagos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ingresos por mes, con filtro por negocio y por fecha.
        </p>
      </div>

      <HistoricoPagosClient
        pagos={filas}
        comercios={(comercios ?? []).map((c) => ({ id: c.id, nombre: c.nombre }))}
        desdeInicial={primerDiaDelMes.toISOString().slice(0, 10)}
        hastaInicial={hoy.toISOString().slice(0, 10)}
      />
    </div>
  );
}
