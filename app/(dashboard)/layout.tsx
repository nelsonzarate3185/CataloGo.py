import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardNav, { DashboardNavMovil } from "@/components/dashboard/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: comercio }, { data: userRecord }] = await Promise.all([
    supabase.from("comercios").select("id, nombre, slug, plan").eq("user_id", user.id).single(),
    supabase.from("users").select("role").eq("email", user.email ?? "").single(),
  ]);

  if (!comercio) redirect("/registro");

  const isSuperAdmin = userRecord?.role === "super_admin";

  // Sin leer para el vendedor son las respuestas del admin.
  const { count: mensajesSinLeer } = await supabase
    .from("mensajes")
    .select("id", { count: "exact", head: true })
    .eq("comercio_id", comercio.id)
    .eq("autor", "admin")
    .is("leido_at", null);

  const navProps = {
    comercioNombre: comercio.nombre,
    comercioSlug: comercio.slug,
    comercioPlan: comercio.plan,
    isSuperAdmin,
    mensajesSinLeer: mensajesSinLeer ?? 0,
  };

  return (
    <div className="min-h-screen bg-background lg:flex">
      <DashboardNav {...navProps} />

      {/* min-w-0 es necesario: sin él, un hijo ancho (una tabla, un nombre
          largo) estira el flex y aparece scroll horizontal en toda la página. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardNavMovil {...navProps} />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
