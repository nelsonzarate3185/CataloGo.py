import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CategoriasClient from "@/components/dashboard/categorias/CategoriasClient";

export default async function CategoriasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: comercio } = await supabase
    .from("comercios")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!comercio) redirect("/registro");

  const [catalogosRes, categoriasRes] = await Promise.all([
    supabase
      .from("catalogos")
      .select("id, nombre")
      .eq("comercio_id", comercio.id)
      .eq("activo", true),
    supabase
      .from("categorias")
      .select("*")
      .order("orden", { ascending: true }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Categorías</h1>
      <CategoriasClient
        catalogos={catalogosRes.data ?? []}
        categorias={categoriasRes.data ?? []}
      />
    </div>
  );
}
