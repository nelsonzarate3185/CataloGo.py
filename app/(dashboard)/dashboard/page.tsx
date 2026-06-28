import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Package, ShoppingBag, Star, TrendingUp, ExternalLink } from "lucide-react";
import CopyLinkButton from "@/components/dashboard/CopyLinkButton";
import { PLAN_LIMITES } from "@/types/database";
import { formatGS } from "@/lib/utils";

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
  const hoy = new Date(ahora.setHours(0, 0, 0, 0)).toISOString();

  const [productosRes, pedidosRes, pedidosHoyRes, pedidosRecientesRes] = await Promise.all([
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
    supabase
      .from("pedidos")
      .select("total", { count: "exact" })
      .eq("comercio_id", comercio.id)
      .gte("created_at", hoy),
    supabase
      .from("pedidos")
      .select("id, created_at, total, customer_name, status")
      .eq("comercio_id", comercio.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const totalProductos = productosRes.count ?? 0;
  const totalPedidos = pedidosRes.count ?? 0;
  const pedidosHoy = pedidosHoyRes.count ?? 0;
  const ventasHoy = (pedidosHoyRes.data ?? []).reduce((s, p) => s + (p.total ?? 0), 0);
  const limiteProductos = PLAN_LIMITES[comercio.plan].productos;
  const porcentajeUso =
    limiteProductos === Infinity ? 0 : (totalProductos / limiteProductos) * 100;
  const catalogoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/c/${comercio.slug}`;

  const fechaHoy = new Date().toLocaleDateString("es-PY", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const metrics = [
    {
      label: "Ventas de hoy",
      value: ventasHoy > 0 ? formatGS(ventasHoy) : "Gs. 0",
      delta: `${pedidosHoy} pedido${pedidosHoy !== 1 ? "s" : ""} hoy`,
      icon: TrendingUp,
      color: "text-brand-green",
    },
    {
      label: "Pedidos (30 días)",
      value: String(totalPedidos),
      delta: "últimos 30 días",
      icon: ShoppingBag,
      color: "text-brand-blue",
      href: "/dashboard/pedidos",
    },
    {
      label: "Productos activos",
      value: String(totalProductos),
      delta: limiteProductos === Infinity ? "ilimitados" : `de ${limiteProductos} del plan`,
      icon: Package,
      color: "text-primary",
      href: "/dashboard/productos",
    },
    {
      label: "Plan actual",
      value: comercio.plan.charAt(0).toUpperCase() + comercio.plan.slice(1),
      delta: "Ver mis planes",
      icon: Star,
      color: "text-[#c4314b]",
      href: "/dashboard/configuracion#plan",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-[24px] font-extrabold text-foreground">
            Buen día, {comercio.nombre} 👋
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1 capitalize">
            Resumen de tu tienda — {fechaHoy}
          </p>
        </div>
        {catalogo && (
          <Link
            href={catalogoUrl}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 rounded-[9px] bg-white border border-sage-300 text-[13.5px] font-bold text-foreground hover:border-primary transition-colors shadow-card"
          >
            Ver mi tienda pública
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Banner upgrade */}
      {comercio.plan === "basico" && porcentajeUso >= 80 && (
        <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">
              Usás {totalProductos} de {limiteProductos} productos del plan gratuito
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Pasate al Plan Pro para productos ilimitados.
            </p>
          </div>
          <Link
            href="/dashboard/configuracion#plan"
            className="shrink-0 text-xs font-bold text-amber-700 underline"
          >
            Ver planes
          </Link>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {metrics.map(({ label, value, delta, icon: Icon, color, href }) => {
          const card = (
            <div className="bg-white rounded-[14px] p-[18px] shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] text-muted-foreground font-semibold">{label}</span>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="font-heading text-[26px] font-extrabold text-foreground my-1">
                {value}
              </div>
              <div className={`text-[12.5px] font-bold ${color}`}>{delta}</div>
            </div>
          );
          return href ? (
            <Link key={label} href={href} className="hover:scale-[1.01] transition-transform">
              {card}
            </Link>
          ) : (
            <div key={label}>{card}</div>
          );
        })}
      </div>

      {/* Link del catálogo + pedidos recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Link catálogo */}
        <div className="bg-white rounded-[14px] p-5 shadow-card">
          <h3 className="font-heading text-[16px] font-extrabold text-foreground mb-4">
            Link de tu tienda
          </h3>
          {catalogo ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-sage-50 border border-sage-300 rounded-lg px-3 py-2 text-sm text-muted-foreground truncate">
                {catalogoUrl}
              </code>
              <CopyLinkButton url={catalogoUrl} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tenés catálogos activos.
            </p>
          )}

          {/* Barra de uso del plan */}
          {limiteProductos !== Infinity && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>{totalProductos} productos activos</span>
                <span>límite: {limiteProductos}</span>
              </div>
              <div className="h-1.5 bg-sage-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(porcentajeUso, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Pedidos recientes */}
        <div className="bg-white rounded-[14px] p-5 shadow-card">
          <h3 className="font-heading text-[16px] font-extrabold text-foreground mb-4">
            Pedidos recientes
          </h3>
          {(pedidosRecientesRes.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aún no recibiste pedidos.
            </p>
          ) : (
            <div className="divide-y divide-sage-200">
              {(pedidosRecientesRes.data ?? []).map((pedido) => (
                <div
                  key={pedido.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-[14px] font-bold text-foreground">
                      {pedido.customer_name ?? "Cliente"}
                    </p>
                    <p className="text-[12.5px] text-muted-foreground">
                      {new Date(pedido.created_at).toLocaleDateString("es-PY")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-bold">
                      {pedido.total ? formatGS(pedido.total) : "—"}
                    </p>
                    <StatusBadge status={pedido.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/dashboard/pedidos"
            className="block mt-3 text-center text-[13px] text-brand-blue font-semibold hover:underline"
          >
            Ver todos los pedidos ›
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    nuevo: { label: "Nuevo", bg: "#e7f4ec", color: "#1f8a52" },
    en_proceso: { label: "En proceso", bg: "#fff7e6", color: "#c77d18" },
    enviado: { label: "Enviado", bg: "#e8f0fb", color: "#1a73c7" },
    entregado: { label: "Entregado", bg: "#e7f4ec", color: "#1f8a52" },
    cancelado: { label: "Cancelado", bg: "#fbe9ec", color: "#c4314b" },
  };
  const s = map[status ?? "nuevo"] ?? map.nuevo;
  return (
    <span
      className="text-[11.5px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}
