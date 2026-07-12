import { createAdminClient } from "@/lib/supabase/admin";
import UsuariosAdminClient from "@/components/admin/UsuariosAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const admin = createAdminClient();

  const [{ data: users, error }, { data: comercios }, { data: authData }] =
    await Promise.all([
      admin
        .from("users")
        .select("uid, email, slug, business_name, role, status, created_at")
        .order("created_at", { ascending: false }),
      admin.from("comercios").select("user_id, plan, activo, nombre"),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

  if (error) throw new Error(error.message);

  // Mapeo auth_id (uuid) → comercio
  const comercioByAuthId = Object.fromEntries(
    (comercios ?? []).map((c) => [c.user_id, c])
  );

  // Puente email → auth_id  (para cuando users.uid !== auth.users.id)
  const emailToAuthId = Object.fromEntries(
    (authData?.users ?? []).map((u) => [u.email ?? "", u.id])
  );

  const enriched = (users ?? []).map((u) => {
    // Intento 1: users.uid == auth.users.id (caso normal)
    let comercio = comercioByAuthId[u.uid] ?? null;

    // Intento 2: puente por email si el uid no coincidió
    if (!comercio && u.email) {
      const authId = emailToAuthId[u.email];
      if (authId) comercio = comercioByAuthId[authId] ?? null;
    }

    return { ...u, comercio };
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-sm text-gray-500 mt-1">
          {enriched.length} usuarios registrados
        </p>
      </div>
      <UsuariosAdminClient users={enriched} />
    </div>
  );
}
