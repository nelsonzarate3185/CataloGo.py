import { createAdminClient } from "@/lib/supabase/admin";
import { Users, Store, ClipboardList, CreditCard } from "lucide-react";
import type { PlanTipo, UserStatus } from "@/types/database";
import Link from "next/link";

const statusLabel: Record<UserStatus, { label: string; color: string }> = {
  active:           { label: "Activo",      color: "bg-green-100 text-green-700" },
  pending_approval: { label: "Pendiente",   color: "bg-yellow-100 text-yellow-700" },
  blocked:          { label: "Bloqueado",   color: "bg-red-100 text-red-700" },
  blocked_unpaid:   { label: "Deuda",       color: "bg-orange-100 text-orange-700" },
  suspended:        { label: "Suspendido",  color: "bg-gray-100 text-gray-600" },
};

const planColors: Record<PlanTipo, string> = {
  basico:   "bg-gray-100 text-gray-700",
  pro:      "bg-blue-100 text-blue-700",
  plus:     "bg-purple-100 text-purple-700",
  business: "bg-orange-100 text-orange-700",
};

export default async function AdminPage() {
  const admin = createAdminClient();

  const [
    { data: users },
    { data: comercios },
    { data: solicitudes },
    { data: planes },
  ] = await Promise.all([
    admin.from("users").select("uid, email, business_name, status, created_at").order("created_at", { ascending: false }),
    admin.from("comercios").select("id, nombre, slug, plan, activo").order("created_at", { ascending: false }),
    admin.from("plan_requests").select("id, vendor_id, status, data, created_at").order("created_at", { ascending: false }).limit(10),
    admin.from("plans").select("id, name, price"),
  ]);

  const listaUsers = users ?? [];
  const listaComercio = comercios ?? [];
  const listaSolicitudes = solicitudes ?? [];

  const pendientes = listaSolicitudes.filter((s) => s.status === "pending");
  const byStatus = listaUsers.reduce<Record<string, number>>((acc, u) => {
    acc[u.status] = (acc[u.status] ?? 0) + 1;
    return acc;
  }, {});
  const byPlan = listaComercio.reduce<Record<string, number>>((acc, c) => {
    acc[c.plan] = (acc[c.plan] ?? 0) + 1;
    return acc;
  }, {});

  const stats = [
    { label: "Usuarios totales", value: listaUsers.length, sub: `${byStatus["active"] ?? 0} activos`, icon: Users, href: "/admin/usuarios" },
    { label: "Negocios registrados", value: listaComercio.length, sub: `${listaComercio.filter(c => c.activo).length} activos`, icon: Store, href: "/admin/comercios" },
    { label: "Solicitudes pendientes", value: pendientes.length, sub: "requieren acción", icon: ClipboardList, href: "/admin/solicitudes", alert: pendientes.length > 0 },
    { label: "Planes configurados", value: planes?.length ?? 0, sub: "en el catálogo", icon: CreditCard, href: "/admin/planes" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Panel de administración</h1>
        <p className="text-sm text-gray-500 mt-1">Vista global de CataloGo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, sub, icon: Icon, href, alert }) => (
          <Link key={label} href={href} className="bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500 font-medium">{label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${alert ? "bg-red-50" : "bg-orange-50"}`}>
                <Icon className={`w-4 h-4 ${alert ? "text-red-500" : "text-orange-500"}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${alert ? "text-red-600" : "text-gray-900"}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución usuarios por estado */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Usuarios por estado</h2>
            <Link href="/admin/usuarios" className="text-sm text-orange-500 hover:text-orange-600 font-medium">Ver todos →</Link>
          </div>
          <div className="space-y-2">
            {(Object.keys(statusLabel) as UserStatus[]).map((st) => {
              const count = byStatus[st] ?? 0;
              const pct = listaUsers.length > 0 ? Math.round((count / listaUsers.length) * 100) : 0;
              const { label, color } = statusLabel[st];
              return (
                <div key={st} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-24 text-center ${color}`}>{label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-5 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Solicitudes recientes */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Solicitudes recientes</h2>
            <Link href="/admin/solicitudes" className="text-sm text-orange-500 hover:text-orange-600 font-medium">Ver todas →</Link>
          </div>
          {listaSolicitudes.length === 0 ? (
            <p className="text-sm text-gray-400">No hay solicitudes.</p>
          ) : (
            <div className="space-y-3">
              {listaSolicitudes.slice(0, 6).map((s) => {
                const data = s.data as Record<string, unknown>;
                const planSolicitado = (data?.plan_id ?? data?.plan ?? "—") as string;
                return (
                  <div key={s.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700 truncate font-medium">{s.vendor_id}</p>
                      <p className="text-xs text-gray-400">Plan: {planSolicitado}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      s.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                      s.status === "approved" ? "bg-green-100 text-green-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {s.status === "pending" ? "Pendiente" : s.status === "approved" ? "Aprobado" : "Rechazado"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Negocios por plan */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Negocios por plan</h2>
            <Link href="/admin/comercios" className="text-sm text-orange-500 hover:text-orange-600 font-medium">Ver todos →</Link>
          </div>
          <div className="space-y-3">
            {(["basico", "pro", "plus", "business"] as PlanTipo[]).map((plan) => {
              const count = byPlan[plan] ?? 0;
              const pct = listaComercio.length > 0 ? Math.round((count / listaComercio.length) * 100) : 0;
              return (
                <div key={plan} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize w-20 text-center ${planColors[plan]}`}>{plan}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-5 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Últimos usuarios registrados */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Últimos usuarios</h2>
            <Link href="/admin/usuarios" className="text-sm text-orange-500 hover:text-orange-600 font-medium">Ver todos →</Link>
          </div>
          <div className="space-y-3">
            {listaUsers.slice(0, 6).map((u) => {
              const st = u.status as UserStatus;
              return (
                <div key={u.uid} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.email}</p>
                    {u.business_name && <p className="text-xs text-gray-400 truncate">{u.business_name}</p>}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusLabel[st]?.color ?? "bg-gray-100 text-gray-600"}`}>
                    {statusLabel[st]?.label ?? st}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
