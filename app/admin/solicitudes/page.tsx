import { createAdminClient } from "@/lib/supabase/admin";
import SolicitudesAdminClient from "@/components/admin/SolicitudesAdminClient";

export default async function AdminSolicitudesPage() {
  const admin = createAdminClient();

  const [{ data: solicitudes, error }, { data: users }] = await Promise.all([
    admin.from("plan_requests").select("*").order("created_at", { ascending: false }),
    admin.from("users").select("uid, email, business_name"),
  ]);

  if (error) throw new Error(error.message);

  const usersMap = Object.fromEntries((users ?? []).map((u) => [u.uid, u]));

  const enriched = (solicitudes ?? []).map((s) => ({
    ...s,
    user: usersMap[s.vendor_id] ?? null,
  }));

  const pendientes = enriched.filter((s) => s.status === "pending").length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Solicitudes de plan</h1>
        <p className="text-sm text-gray-500 mt-1">
          {enriched.length} solicitudes totales
          {pendientes > 0 && <span className="ml-2 text-orange-600 font-semibold">· {pendientes} pendientes</span>}
        </p>
      </div>
      <SolicitudesAdminClient solicitudes={enriched} />
    </div>
  );
}
