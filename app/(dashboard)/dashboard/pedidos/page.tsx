import { redirect } from "next/navigation";
import { getServerUser, adminDb, fromDoc, fromDocs } from "@/lib/firebase/admin";
import type { Comercio, Pedido } from "@/types/database";
import PedidosClient from "@/components/dashboard/pedidos/PedidosClient";

export default async function PedidosPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const comercioSnap = await adminDb
    .collection("comercios")
    .where("user_id", "==", user.uid)
    .limit(1)
    .get();

  const comercio = comercioSnap.empty ? null : fromDoc<Comercio>(comercioSnap.docs[0]);
  if (!comercio) redirect("/registro");

  const pedidosSnap = await adminDb
    .collection("pedidos")
    .where("comercio_id", "==", comercio.id)
    .orderBy("created_at", "desc")
    .limit(200)
    .get();

  const pedidos = fromDocs<Pedido>(pedidosSnap);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pedidos recibidos</h1>
      <PedidosClient pedidos={pedidos} comercioNombre={comercio.nombre} />
    </div>
  );
}
