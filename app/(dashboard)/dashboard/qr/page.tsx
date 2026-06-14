import { redirect } from "next/navigation";
import { getServerUser, adminDb, fromDoc } from "@/lib/firebase/admin";
import QRClient from "@/components/dashboard/qr/QRClient";
import type { Comercio } from "@/types/database";

export default async function QRPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const snap = await adminDb
    .collection("comercios")
    .where("user_id", "==", user.uid)
    .limit(1)
    .get();

  if (snap.empty) redirect("/registro");

  const comercio = fromDoc<Comercio>(snap.docs[0])!;
  const catalogoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/c/${comercio.slug}`;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Mi código QR</h1>
      <p className="text-sm text-gray-500 mb-8">
        Imprimilo, pegalo en tu local y tus clientes verán tu catálogo al escanearlo.
      </p>
      <QRClient url={catalogoUrl} comercioNombre={comercio.nombre} />
    </div>
  );
}
