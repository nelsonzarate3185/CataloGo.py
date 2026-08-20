import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ResenasClient from "@/components/dashboard/resenas/ResenasClient";

export default async function ResenasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: comercio } = await supabase
    .from("comercios")
    .select("id, slug, resenas_moderadas")
    .eq("user_id", user.id)
    .single();
  if (!comercio) redirect("/registro");

  // El dueño ve también las pendientes: lo permite su policy de RLS.
  const { data: resenas, error } = await supabase
    .from("resenas")
    .select("*, productos ( id, nombre )")
    .eq("comercio_id", comercio.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(`Error cargando las reseñas: ${error.message}`);

  return (
    <div>
      <h1 className="mb-1">Reseñas</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Lo que opinan los compradores sobre tus productos.
      </p>

      <ResenasClient
        resenas={(resenas ?? []) as never}
        comercioId={comercio.id}
        slug={comercio.slug}
        moderadaInicial={comercio.resenas_moderadas}
      />
    </div>
  );
}
