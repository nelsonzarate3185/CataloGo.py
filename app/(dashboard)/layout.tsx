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
    supabase.from("users").select("role").eq("id", user.id).single(),
  ]);

  if (!comercio) redirect("/registro");

  const isSuperAdmin = userRecord?.role === "super_admin";

  return (
    <div className="min-h-screen bg-sage-100 flex">
      <DashboardNav
        comercioNombre={comercio.nombre}
        comercioSlug={comercio.slug}
        comercioPlan={comercio.plan}
        isSuperAdmin={isSuperAdmin}
      />
      <main className="flex-1 p-7 overflow-auto">{children}</main>
    </div>
  );
}
