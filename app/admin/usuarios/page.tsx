import { createAdminClient } from "@/lib/supabase/admin";
import UsuariosAdminClient from "@/components/admin/UsuariosAdminClient";

export default async function AdminUsuariosPage() {
  const admin = createAdminClient();

  const { data: users, error } = await admin
    .from("users")
    .select("uid, email, slug, business_name, role, status, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-sm text-gray-500 mt-1">{users?.length ?? 0} usuarios registrados</p>
      </div>
      <UsuariosAdminClient users={users ?? []} />
    </div>
  );
}
