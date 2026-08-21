import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { baseUrlServidor, urlCatalogo } from "@/lib/urls";
import QRClient from "@/components/dashboard/qr/QRClient";

export default async function QRPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: comercio } = await supabase
    .from("comercios")
    .select("id, nombre, slug")
    .eq("user_id", user.id)
    .single();
  if (!comercio) redirect("/registro");

  const reqHeaders = await headers();
  const appUrl = baseUrlServidor(reqHeaders);
  const catalogoUrl = urlCatalogo(appUrl, comercio.slug);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Mi código QR</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Imprimilo, pegalo en tu local y tus clientes verán tu catálogo al escanearlo.
      </p>
      <QRClient url={catalogoUrl} comercioNombre={comercio.nombre} />
    </div>
  );
}
