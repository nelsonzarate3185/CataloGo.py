export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ConfiguracionClient from "@/components/dashboard/configuracion/ConfiguracionClient";
import type { PlanTipo } from "@/types/database";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: comercio }, { data: solicitudPendiente }] = await Promise.all([
    supabase.from("comercios").select("*").eq("user_id", user.id).single(),
    supabase
      .from("plan_requests")
      .select("data")
      .eq("vendor_id", user.id)
      .eq("status", "pending")
      .maybeSingle(),
  ]);

  if (!comercio) redirect("/registro");

  const planPendiente = solicitudPendiente
    ? ((solicitudPendiente.data as Record<string, unknown>)?.plan_id as PlanTipo ?? null)
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Configuración</h1>
      <ConfiguracionClient
        comercio={comercio}
        userEmail={user.email ?? ""}
        planPendiente={planPendiente}
      />
    </div>
  );
}
