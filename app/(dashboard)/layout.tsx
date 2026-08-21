import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardNav from "@/components/dashboard/DashboardNav";

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

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardNav
        comercioNombre={comercio.nombre}
        comercioSlug={comercio.slug}
        comercioPlan={comercio.plan}
        isSuperAdmin={isSuperAdmin}
        mensajesSinLeer={mensajesSinLeer ?? 0}
      />
      <main className="flex-1 p-7 overflow-auto">{children}</main>
    </div>
  );
}
