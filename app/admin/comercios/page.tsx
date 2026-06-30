import { createAdminClient } from "@/lib/supabase/admin";
import ComerciosAdminClient from "@/components/admin/ComerciosAdminClient";

export default async function AdminComerciosPage() {
  const admin = createAdminClient();

  const { data: comercios, error } = await admin
    .from("comercios")
    .select("id, nombre, slug, plan, activo, whatsapp, rubro, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Error cargando negocios: ${error.message}`);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Negocios</h1>
        <p className="text-sm text-gray-500 mt-1">
          {comercios?.length ?? 0} negocios registrados en total
        </p>
      </div>
      <ComerciosAdminClient comercios={comercios ?? []} />
    </div>
  );
}
