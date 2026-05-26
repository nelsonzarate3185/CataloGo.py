import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getServerUser, adminDb, fromDoc, fromDocs } from "@/lib/firebase/admin";
import { PLAN_LIMITES } from "@/types/database";
import type { Comercio, Producto, Catalogo, Categoria } from "@/types/database";
import ProductosClient from "@/components/dashboard/productos/ProductosClient";

export default async function ProductosPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const comercioSnap = await adminDb
    .collection("comercios")
    .where("user_id", "==", user.uid)
    .limit(1)
    .get();

  const comercio = comercioSnap.empty ? null : fromDoc<Comercio>(comercioSnap.docs[0]);
  if (!comercio) redirect("/registro");

  const [productosSnap, catalogosSnap] = await Promise.all([
    adminDb
      .collection("productos")
      .where("comercio_id", "==", comercio.id)
      .orderBy("orden", "asc")
      .get(),
    adminDb
      .collection("catalogos")
      .where("comercio_id", "==", comercio.id)
      .where("activo", "==", true)
      .get(),
  ]);

  const productos = fromDocs<Producto>(productosSnap);
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

  const limite = PLAN_LIMITES[comercio.plan].productos;
  const totalActivos = productos.filter((p) => p.disponible).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {productos.length} producto{productos.length !== 1 ? "s" : ""}
            {limite !== Number.MAX_SAFE_INTEGER && ` · límite: ${limite}`}
          </p>
        </div>
      </div>

      {comercio.plan === "basico" && totalActivos >= limite && (
        <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-amber-800">
            Alcanzaste el límite de {limite} productos del plan gratuito.{" "}
            <a href="/dashboard/configuracion#plan" className="font-semibold underline">
              Upgradear a Pro
            </a>
          </span>
        </div>
      )}

      <ProductosClient
        productos={productos}
        catalogos={catalogos}
        categorias={categorias}
        comercioId={comercio.id}
        plan={comercio.plan}
        limiteProductos={limite}
      />
    </div>
  );
}
