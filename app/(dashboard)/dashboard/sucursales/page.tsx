export const dynamic = 'force-dynamic';

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PLAN_LIMITES } from "@/types/database";
import SucursalesClient from "@/components/dashboard/sucursales/SucursalesClient";

export default async function SucursalesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: comercio } = await supabase
    .from("comercios")
    .select("id, plan")
    .eq("user_id", user.id)
    .single();
  if (!comercio) redirect("/registro");

  if (comercio.plan !== "business") redirect("/dashboard/configuracion#plan");

  const { data: sucursales } = await supabase
    .from("sucursales")
    .select("*")
    .eq("comercio_id", comercio.id)
    .order("created_at", { ascending: true });

  const limite = PLAN_LIMITES[comercio.plan].sucursales;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Sucursales</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {(sucursales ?? []).filter((s) => s.activo).length} de {limite} sucursales activas
        </p>
      </div>
      <SucursalesClient
        sucursales={sucursales ?? []}
        comercioId={comercio.id}
        limite={limite}
      />
    </div>
  );
}
