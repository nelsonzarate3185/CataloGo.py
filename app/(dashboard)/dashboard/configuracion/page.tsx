import { redirect } from "next/navigation";
import { getServerUser, adminDb, fromDoc } from "@/lib/firebase/admin";
import type { Comercio } from "@/types/database";
import ConfiguracionClient from "@/components/dashboard/configuracion/ConfiguracionClient";

export default async function ConfiguracionPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const comercioSnap = await adminDb
    .collection("comercios")
    .where("user_id", "==", user.uid)
    .limit(1)
    .get();

  const comercio = comercioSnap.empty ? null : fromDoc<Comercio>(comercioSnap.docs[0]);
  if (!comercio) redirect("/registro");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configuración</h1>
      <ConfiguracionClient comercio={comercio} userEmail={user.email ?? ""} />
    </div>
  );
}
