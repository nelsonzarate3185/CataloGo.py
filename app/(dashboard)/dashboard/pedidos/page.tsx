import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PedidosClient from "@/components/dashboard/pedidos/PedidosClient";

export default async function PedidosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: comercio } = await supabase
    .from("comercios")
    .select("id, nombre")
    .eq("user_id", user.id)
    .single();
  if (!comercio) redirect("/registro");

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("*")
    .eq("comercio_id", comercio.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Pedidos recibidos</h1>
      <PedidosClient
        pedidos={pedidos ?? []}
        comercioNombre={comercio.nombre}
      />
    </div>
  );
}
