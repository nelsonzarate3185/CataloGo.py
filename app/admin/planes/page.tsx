import { createAdminClient } from "@/lib/supabase/admin";
import PlanesAdminClient from "@/components/admin/PlanesAdminClient";

export default async function AdminPlanesPage() {
  const admin = createAdminClient();

  const { data: planes, error } = await admin
    .from("plans")
    .select("*")
    .order("price", { ascending: true });

  if (error) throw new Error(error.message);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Planes</h1>
        <p className="text-sm text-gray-500 mt-1">Configurá los planes disponibles para los negocios</p>
      </div>
      <PlanesAdminClient planes={planes ?? []} />
    </div>
  );
}
