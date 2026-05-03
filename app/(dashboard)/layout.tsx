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

  // Verificar que tenga comercio creado
  const { data: comercio } = await supabase
    .from("comercios")
    .select("id, nombre, slug, plan")
    .eq("user_id", user.id)
    .single();

  if (!comercio) redirect("/registro");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardNav comercioNombre={comercio.nombre} comercioSlug={comercio.slug} />
      <main className="flex-1 p-6 overflow-auto max-w-5xl">{children}</main>
    </div>
  );
}
