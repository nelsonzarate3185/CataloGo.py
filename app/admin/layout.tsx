export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav, { AdminNavMovil } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userRecord } = await supabase
    .from("users")
    .select("role")
    .eq("email", user.email ?? "")
    .single();

  if (userRecord?.role !== "super_admin") redirect("/dashboard");

  // El contador se resuelve acá y viaja al nav como prop: el layout ya es
  // dinámico, así que no agrega ninguna consulta extra por navegación.
  const [{ count }, { count: mensajes }] = await Promise.all([
    supabase
      .from("eventos_admin")
      .select("id", { count: "exact", head: true })
      .is("leido_at", null),
    // Sin leer para el admin son los que escribió el vendedor.
    supabase
      .from("mensajes")
      .select("id", { count: "exact", head: true })
      .eq("autor", "vendedor")
      .is("leido_at", null),
  ]);

  const navProps = { sinLeer: count ?? 0, mensajesSinLeer: mensajes ?? 0 };

  return (
    <div className="min-h-screen bg-muted lg:flex">
      <AdminNav {...navProps} />

      {/* min-w-0 es necesario: sin él las tablas anchas estiran el flex y
          aparece scroll horizontal en toda la página en vez de sólo en ellas. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminNavMovil {...navProps} />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
