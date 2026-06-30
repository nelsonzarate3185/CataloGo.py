import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { PLAN_LIMITES } from "@/types/database";
import ProductosClient from "@/components/dashboard/productos/ProductosClient";

export default async function ProductosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: comercio } = await supabase
    .from("comercios")
    .select("id, plan")
    .eq("user_id", user.id)
    .single();
  if (!comercio) redirect("/registro");

  const [productosRes, catalogosRes, categoriasRes] = await Promise.all([
    supabase
      .from("productos")
      .select("*")
      .eq("comercio_id", comercio.id)
      .order("orden", { ascending: true }),
    supabase
      .from("catalogos")
      .select("id, nombre")
      .eq("comercio_id", comercio.id)
      .eq("activo", true),
    supabase
      .from("categorias")
      .select("*")
      .order("orden", { ascending: true }),
  ]);

  const productos = productosRes.data ?? [];
  const catalogos = catalogosRes.data ?? [];
  const categorias = categoriasRes.data ?? [];
  const limite = PLAN_LIMITES[comercio.plan].productos;
  const limiteImagenes = PLAN_LIMITES[comercio.plan].imagenes;
  const totalActivos = productos.filter((p) => p.disponible).length;
  const limiteAlcanzado = limite < Number.MAX_SAFE_INTEGER && totalActivos >= limite;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {productos.length} producto{productos.length !== 1 ? "s" : ""}
            {limite < Number.MAX_SAFE_INTEGER && ` · ${totalActivos}/${limite} activos`}
          </p>
        </div>
      </div>

      {limiteAlcanzado && (
        <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-amber-800">
            Alcanzaste el límite de {limite} productos de tu plan.{" "}
            <a href="/dashboard/configuracion#plan" className="font-semibold underline">
              Mejorar plan
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
        limiteImagenes={limiteImagenes}
      />
    </div>
  );
}
