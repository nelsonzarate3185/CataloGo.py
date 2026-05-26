import { redirect } from "next/navigation";
import { getServerUser, adminDb, fromDoc, fromDocs } from "@/lib/firebase/admin";
import type { Comercio, Catalogo, Categoria } from "@/types/database";
import CategoriasClient from "@/components/dashboard/categorias/CategoriasClient";

export default async function CategoriasPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const comercioSnap = await adminDb
    .collection("comercios")
    .where("user_id", "==", user.uid)
    .limit(1)
    .get();

  const comercio = comercioSnap.empty ? null : fromDoc<Comercio>(comercioSnap.docs[0]);
  if (!comercio) redirect("/registro");

  const catalogosSnap = await adminDb
    .collection("catalogos")
    .where("comercio_id", "==", comercio.id)
    .where("activo", "==", true)
    .get();

  const catalogos = fromDocs<Catalogo>(catalogosSnap);

  let categorias: Categoria[] = [];
  if (catalogos.length > 0) {
    const catalogoIds = catalogos.map((c) => c.id);
    const categoriasSnap = await adminDb
      .collection("categorias")
      .where("catalogo_id", "in", catalogoIds)
      .orderBy("orden", "asc")
      .get();
    categorias = fromDocs<Categoria>(categoriasSnap);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Categorías</h1>
      <CategoriasClient catalogos={catalogos} categorias={categorias} />
    </div>
  );
}
