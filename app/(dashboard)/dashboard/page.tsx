import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Copy, AlertTriangle } from "lucide-react";
import CopyLinkButton from "@/components/dashboard/CopyLinkButton";
import { PLAN_LIMITES } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: comercio } = await supabase
    .from("comercios")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!comercio) redirect("/registro");

  const { data: catalogo } = await supabase
    .from("catalogos")
    .select("id")
    .eq("comercio_id", comercio.id)
    .eq("activo", true)
    .limit(1)
    .single();

  const ahora = new Date();
  const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [productosRes, pedidosRes] = await Promise.all([
    supabase
      .from("productos")
      .select("id", { count: "exact", head: true })
      .eq("comercio_id", comercio.id)
      .eq("disponible", true),
    supabase
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .eq("comercio_id", comercio.id)
      .gte("created_at", hace30Dias),
  ]);

  const totalProductos = productosRes.count ?? 0;
  const totalPedidos = pedidosRes.count ?? 0;
  const limiteProductos = PLAN_LIMITES[comercio.plan].productos;
  const porcentajeUso =
    limiteProductos === Infinity ? 0 : (totalProductos / limiteProductos) * 100;
  const catalogoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/c/${comercio.slug}`;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Hola, {comercio.nombre}
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        Panel de administración — Plan{" "}
        <span className="font-semibold capitalize text-primary">
          {comercio.plan}
        </span>
      </p>

      {/* Banner upgrade si plan básico y cerca del límite */}
      {comercio.plan === "basico" && porcentajeUso >= 80 && (
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              Estás usando {totalProductos} de {limiteProductos} productos del plan gratuito
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Pasate al Plan Pro para productos ilimitados.
            </p>
          </div>
          <Link
            href="/dashboard/configuracion#plan"
            className="shrink-0 text-xs font-semibold text-amber-700 underline"
          >
            Ver planes
          </Link>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Productos activos" value={totalProductos} href="/dashboard/productos" />
        <StatCard label="Pedidos (30 días)" value={totalPedidos} href="/dashboard/pedidos" />
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500 mb-1">Plan actual</p>
          <p className="text-2xl font-bold text-gray-900 capitalize">
            {comercio.plan}
          </p>
          {limiteProductos !== Infinity && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{totalProductos} productos</span>
                <span>límite: {limiteProductos}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(porcentajeUso, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Link del catálogo */}
      <div className="bg-white rounded-xl border p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">
          Link de tu catálogo
        </p>
        {catalogo ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 text-sm text-gray-700 truncate">
              {catalogoUrl}
            </code>
            <CopyLinkButton url={catalogoUrl} />
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            No tenés catálogos activos.{" "}
            <Link href="/dashboard/catalogos" className="text-primary">
              Crear uno
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border p-5 hover:border-primary transition-colors"
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </Link>
  );
}
