import { createAdminClient } from "@/lib/supabase/admin";
import { Store, Package, ShoppingBag, TrendingUp } from "lucide-react";
import type { PlanTipo } from "@/types/database";
import Link from "next/link";

const planColors: Record<PlanTipo, string> = {
  basico: "bg-gray-100 text-gray-700",
  pro: "bg-blue-100 text-blue-700",
  plus: "bg-purple-100 text-purple-700",
  business: "bg-orange-100 text-orange-700",
};

export default async function AdminPage() {
  const admin = createAdminClient();

  const [{ data: comercios }, { count: totalProductos }, { count: totalPedidos }] =
    await Promise.all([
      admin.from("comercios").select("id, nombre, slug, plan, activo, created_at").order("created_at", { ascending: false }),
      admin.from("productos").select("id", { count: "exact", head: true }),
      admin.from("pedidos").select("id", { count: "exact", head: true }),
    ]);

  const lista = comercios ?? [];
  const totalNegocios = lista.length;
  const negociosActivos = lista.filter((c) => c.activo).length;

  const byPlan = lista.reduce<Record<string, number>>((acc, c) => {
    acc[c.plan] = (acc[c.plan] ?? 0) + 1;
    return acc;
  }, {});

  const stats = [
    { label: "Negocios registrados", value: totalNegocios, icon: Store, sub: `${negociosActivos} activos` },
    { label: "Productos totales", value: totalProductos ?? 0, icon: Package, sub: "en todos los catálogos" },
    { label: "Pedidos totales", value: totalPedidos ?? 0, icon: ShoppingBag, sub: "generados via WhatsApp" },
    { label: "Ingresos MRR", value: "—", icon: TrendingUp, sub: "próximamente" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Panel de administración</h1>
        <p className="text-sm text-gray-500 mt-1">Vista global de todos los negocios en CataloGo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500 font-medium">{label}</p>
              <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-orange-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Distribución de planes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Distribución por plan</h2>
          <div className="space-y-3">
            {(["basico", "pro", "plus", "business"] as PlanTipo[]).map((plan) => {
              const count = byPlan[plan] ?? 0;
              const pct = totalNegocios > 0 ? Math.round((count / totalNegocios) * 100) : 0;
              return (
                <div key={plan} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${planColors[plan]}`}>
                    {plan}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-orange-400 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Últimos negocios registrados */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Últimos negocios</h2>
            <Link href="/admin/comercios" className="text-sm text-orange-500 hover:text-orange-600 font-medium">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-3">
            {lista.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.nombre}</p>
                  <p className="text-xs text-gray-400">/{c.slug}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ${planColors[c.plan as PlanTipo]}`}>
                  {c.plan}
                </span>
              </div>
            ))}
            {lista.length === 0 && (
              <p className="text-sm text-gray-400">No hay negocios registrados aún.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
