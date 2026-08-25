import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { PLAN_LIMITES } from "@/types/database";
import { estadoCambios, CARGA_INICIAL } from "@/lib/cobros";
import ProductosClient from "@/components/dashboard/productos/ProductosClient";

export default async function ProductosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: comercio } = await supabase
    .from("comercios")
    .select("id, plan, cambios_usados, cambios_periodo_inicio, publicaciones_totales")
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

  // Sólo el plan gratuito tiene cupo; para el resto esto es null y no se muestra.
  const cambios = estadoCambios(
    comercio.plan,
    comercio.cambios_usados,
    comercio.cambios_periodo_inicio,
    comercio.publicaciones_totales,
    new Date()
  );
  const limiteImagenes = PLAN_LIMITES[comercio.plan].imagenes;
  const totalActivos = productos.filter((p) => p.disponible).length;
  const limiteAlcanzado = limite < Number.MAX_SAFE_INTEGER && totalActivos >= limite;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Productos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {productos.length} producto{productos.length !== 1 ? "s" : ""}
            {limite < Number.MAX_SAFE_INTEGER && ` · ${totalActivos}/${limite} activos`}
          </p>

          {cambios && (
            <p className="mt-1 text-sm text-muted-foreground">
              {cambios.enCargaInicial ? (
                <>
                  Tus primeras {CARGA_INICIAL} publicaciones no consumen cambios.
                </>
              ) : cambios.restantes > 0 ? (
                <>
                  Te{" "}
                  <strong className="text-foreground">
                    {cambios.restantes === 1
                      ? "queda 1 cambio"
                      : `quedan ${cambios.restantes} cambios`}
                  </strong>{" "}
                  de {cambios.limite}
                  {cambios.seReinicia &&
                    ` · se renuevan el ${cambios.seReinicia.toLocaleDateString("es-PY")}`}
                </>
              ) : (
                <span className="text-deal">
                  Usaste tus {cambios.limite} cambios
                  {cambios.seReinicia &&
                    ` · se renuevan el ${cambios.seReinicia.toLocaleDateString("es-PY")}`}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {limiteAlcanzado && (
        <div className="mb-4 flex items-center gap-3 bg-cat-ambar-fondo border border-cat-ambar/30 rounded-xl p-4 text-sm">
          <AlertTriangle className="w-4 h-4 text-cat-ambar shrink-0" />
          <span className="text-cat-ambar">
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
