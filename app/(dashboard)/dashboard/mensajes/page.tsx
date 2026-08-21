export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Hilo from "@/components/mensajes/Hilo";
import type { Mensaje } from "@/types/database";

export default async function MensajesVendedorPage() {
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

  const { data, error } = await supabase
    .from("mensajes")
    .select("*")
    .eq("comercio_id", comercio.id)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Error cargando los mensajes: ${error.message}`);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Consultas a CataloGo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escribinos por habilitación de cuenta, pagos o cualquier duda. Te
          respondemos acá mismo.
        </p>
      </div>

      <Hilo
        comercioId={comercio.id}
        autor="vendedor"
        mensajes={(data ?? []) as Mensaje[]}
        ayuda="Contanos tu consulta con el mayor detalle posible."
      />
    </div>
  );
}
