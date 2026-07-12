import { createAdminClient } from "@/lib/supabase/admin";
import UsuariosAdminClient from "@/components/admin/UsuariosAdminClient";

export default async function AdminUsuariosPage() {
  const admin = createAdminClient();

  const [{ data: users, error }, { data: comercios }] = await Promise.all([
    admin.from("users").select("uid, email, slug, business_name, role, status, created_at").order("created_at", { ascending: false }),
    admin.from("comercios").select("user_id, plan, activo, nombre"),
  ]);

  if (error) throw new Error(error.message);

  // Mapear comercios por user_id (uuid) → el uid en users es el mismo valor como texto
  const comercioMap = Object.fromEntries(
    (comercios ?? []).map((c) => [c.user_id, c])
  );

  const enriched = (users ?? []).map((u) => ({
    ...u,
    comercio: comercioMap[u.uid] ?? null,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-sm text-gray-500 mt-1">{enriched.length} usuarios registrados</p>
      </div>
      <UsuariosAdminClient users={enriched} />
    </div>
  );
}
