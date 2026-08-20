import { createAdminClient } from "@/lib/supabase/admin";
import { Users, Store, ClipboardList, CreditCard } from "lucide-react";
import type { PlanTipo, UserStatus } from "@/types/database";
import Link from "next/link";
import {
  EstadoBadge,
  PlanBadge,
  SolicitudBadge,
  ESTADOS_COMERCIO,
} from "@/components/admin/badges";


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
        <h1 className="text-2xl font-bold text-foreground">Panel de administración</h1>
        <p className="text-sm text-muted-foreground mt-1">Vista global de CataloGo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, sub, icon: Icon, href, alert }) => (
          <Link key={label} href={href} className="bg-card rounded-xl border p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground font-medium">{label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${alert ? "bg-destructive/10" : "bg-primary/10"}`}>
                <Icon className={`w-4 h-4 ${alert ? "text-destructive" : "text-primary"}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${alert ? "text-destructive" : "text-foreground"}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución usuarios por estado */}
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Usuarios por estado</h2>
            <Link href="/admin/usuarios" className="text-sm text-primary hover:text-primary font-medium">Ver todos →</Link>
          </div>
          <div className="space-y-2">
            {(Object.keys(ESTADOS_COMERCIO) as UserStatus[]).map((st) => {
              const count = byStatus[st] ?? 0;
              const pct = listaUsers.length > 0 ? Math.round((count / listaUsers.length) * 100) : 0;
              return (
                <div key={st} className="flex items-center gap-3">
                  <EstadoBadge estado={st} className="w-24 justify-center" />
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-5 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Solicitudes recientes */}
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Solicitudes recientes</h2>
            <Link href="/admin/solicitudes" className="text-sm text-primary hover:text-primary font-medium">Ver todas →</Link>
          </div>
          {listaSolicitudes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay solicitudes.</p>
          ) : (
            <div className="space-y-3">
              {listaSolicitudes.slice(0, 6).map((s) => {
                const data = s.data as Record<string, unknown>;
                const planSolicitado = (data?.plan_id ?? data?.plan ?? "—") as string;
                return (
                  <div key={s.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate font-medium">{s.vendor_id}</p>
                      <p className="text-xs text-muted-foreground">Plan: {planSolicitado}</p>
                    </div>
                    <SolicitudBadge estado={s.status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Negocios por plan */}
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Negocios por plan</h2>
            <Link href="/admin/comercios" className="text-sm text-primary hover:text-primary font-medium">Ver todos →</Link>
          </div>
          <div className="space-y-3">
            {(["basico", "pro", "plus", "business"] as PlanTipo[]).map((plan) => {
              const count = byPlan[plan] ?? 0;
              const pct = listaComercio.length > 0 ? Math.round((count / listaComercio.length) * 100) : 0;
              return (
                <div key={plan} className="flex items-center gap-3">
                  <PlanBadge plan={plan} className="w-20 justify-center capitalize" />
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-5 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Últimos usuarios registrados */}
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Últimos usuarios</h2>
            <Link href="/admin/usuarios" className="text-sm text-primary hover:text-primary font-medium">Ver todos →</Link>
          </div>
          <div className="space-y-3">
            {listaUsers.slice(0, 6).map((u) => {
              const st = u.status as UserStatus;
              return (
                <div key={u.uid} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.email}</p>
                    {u.business_name && <p className="text-xs text-muted-foreground truncate">{u.business_name}</p>}
                  </div>
                  <EstadoBadge estado={st} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
