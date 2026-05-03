import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ConfiguracionClient from "@/components/dashboard/configuracion/ConfiguracionClient";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: comercio } = await supabase
    .from("comercios")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (!comercio) redirect("/registro");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configuración</h1>
      <ConfiguracionClient comercio={comercio} userEmail={user.email ?? ""} />
    </div>
  );
}
