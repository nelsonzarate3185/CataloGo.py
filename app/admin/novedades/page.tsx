export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import NovedadesClient from "@/components/admin/NovedadesClient";
import type { EventoAdmin } from "@/types/database";

export default async function NovedadesPage() {
  // Con el cliente de sesión y no el admin: la policy de RLS ya restringe la
  // tabla al superadmin, y el layout verificó el rol antes de llegar acá.
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("eventos_admin")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(`Error cargando las novedades: ${error.message}`);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Novedades</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuentas y tiendas nuevas, de la más reciente a la más antigua.
        </p>
      </div>

      <NovedadesClient eventos={(data ?? []) as EventoAdmin[]} />
    </div>
  );
}
